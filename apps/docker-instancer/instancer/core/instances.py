import asyncio
import uuid
from functools import cache
from http import HTTPStatus

from aiodocker import Docker, DockerError
from aiodocker.containers import DockerContainer
from fastapi import HTTPException

from instancer.core.cache import delete_instance_expiration, instance_lock, set_instance_expiration
from instancer.core.config import config
from instancer.core.instancer.const import ContainerLabels, get_common_labels
from instancer.core.instancer.containers import (
    cleanup_containers,
    create_container,
    get_containers,
    instance_exists,
)
from instancer.core.instancer.networks import cleanup_networks, create_networks, create_routing_network
from instancer.core.instancer.traefik import extract_exposes
from instancer.core.instancer.volumes import cleanup_volumes, create_volumes
from instancer.protocol import types as protocol
from instancer.util.expiration import get_effective_expiration
from instancer.util.logger import logger
from instancer.util.time import timestamp_milliseconds


NOT_ACQUIRED_ERROR = HTTPException(status_code=400, detail='Another instance operation is in progress.')


@cache
def get_docker() -> Docker:
    # FIXME(es3n1n): This is a workaround for prunner process not having a loop at import time.
    return Docker()


def _split_image_ref(image: str) -> tuple[str, str | None]:
    last_slash = image.rfind('/')
    last_colon = image.rfind(':')
    if last_colon > last_slash:
        return image[:last_colon], image[last_colon + 1 :]
    return image, None


async def _ensure_image(docker: Docker, image: str) -> None:
    try:
        await docker.images.get(image)
    except DockerError:
        pass
    else:
        return

    if '@' in image:
        await docker.images.pull(image)
        return

    name, tag = _split_image_ref(image)
    await docker.images.pull(name, tag=tag or 'latest')


async def _show_containers(containers: list[DockerContainer]) -> list[dict]:
    results = await asyncio.gather(*[c.show() for c in containers], return_exceptions=True)
    details: list[dict] = []
    for result in results:
        if isinstance(result, DockerError) and result.status == HTTPStatus.NOT_FOUND:
            continue
        if isinstance(result, BaseException):
            raise result
        details.append(result)
    return details


async def start_instance(form: protocol.RCTFCreateInstanceForm) -> protocol.RCTFInstanceDetails:
    async with instance_lock(form.challenge_integration_id, form.team_id) as acquired:
        if not acquired:
            raise NOT_ACQUIRED_ERROR

        docker = get_docker()
        if await instance_exists(docker, form.challenge_integration_id, form.team_id):
            raise HTTPException(status_code=400, detail='Instance already exists, stop it first')

        started_at = timestamp_milliseconds()
        expires_at = started_at + form.timeout_milliseconds
        instance_id = uuid.uuid4().hex[:12]

        common_labels = get_common_labels(
            instance_id=instance_id,
            expires_at=expires_at,
            challenge_id=form.challenge_integration_id,
            team_id=form.team_id,
            started_at=started_at,
        )

        exposes: dict[str, list[protocol.InstancerExpose]] = {}
        expose_indices: dict[str, list[int]] = {}
        for index, expose in enumerate(form.expose):
            exposes.setdefault(expose.container_name, []).append(expose)
            expose_indices.setdefault(expose.container_name, []).append(index)

        created_containers: list[DockerContainer] = []
        networks_created: dict[str, str] = {}
        routing_networks_created: list[str] = []
        volumes_created: dict[str, str] = {}
        indexed_endpoints: list[tuple[int, protocol.RCTFInstanceDetails.Endpoint]] = []

        try:
            networks_created = await create_networks(docker, form.config.networks, common_labels)
            volumes_created = await create_volumes(docker, form.config.volumes, common_labels)
            for i, (svc_name, container) in enumerate(form.config.services.items()):
                await _ensure_image(docker, container.image)

                routing_network: str | None = None
                if exposes.get(svc_name):
                    routing_network = await create_routing_network(docker, instance_id, i, common_labels)
                    routing_networks_created.append(routing_network)

                created, endpoints = await create_container(
                    docker=docker,
                    challenge_integration_id=form.challenge_integration_id,
                    exposes=exposes,
                    networks_created=networks_created,
                    volumes_created=volumes_created,
                    common_labels=common_labels,
                    svc_name=svc_name,
                    container=container,
                    routing_network=routing_network,
                    global_indices=expose_indices.get(svc_name, []),
                )
                created_containers.append(created)
                indexed_endpoints.extend(zip(expose_indices.get(svc_name, []), endpoints, strict=True))

            await asyncio.gather(*[container.start() for container in created_containers])
        except Exception as err:
            await cleanup_containers(created_containers)
            await cleanup_networks(docker, list(networks_created.values()) + routing_networks_created)
            await cleanup_volumes(docker, list(volumes_created.values()))

            if isinstance(err, HTTPException):
                raise

            logger.opt(exception=err).error(
                f'Failed to start instance: {form.challenge_integration_id=} {form.team_id=}'
            )
            raise HTTPException(status_code=500, detail='Failed to start instance') from err

        all_endpoints = [endpoint for _, endpoint in sorted(indexed_endpoints, key=lambda item: item[0])]
        return protocol.RCTFInstanceDetails(
            status=protocol.InstanceStatus.STARTING,
            time_left_milliseconds=expires_at - timestamp_milliseconds(),
            endpoints=all_endpoints,
        )


async def _collect_instance_resources(
    containers: list[DockerContainer],
) -> tuple[set[str], set[str]]:
    networks: set[str] = set()
    volumes: set[str] = set()

    details_list = await asyncio.gather(*[container.show() for container in containers])

    for details in details_list:
        for net_name in details['NetworkSettings']['Networks']:
            if net_name.startswith(f'{config.PREFIX}-'):
                networks.add(net_name)

        for mount in details.get('Mounts') or []:
            if mount.get('Type') != 'volume':
                continue

            vol_name = mount.get('Name', '')
            if vol_name.startswith(f'{config.PREFIX}-'):
                volumes.add(vol_name)

    return networks, volumes


async def _stop_and_delete_containers(containers: list[DockerContainer], challenge_name: str, team_id: str) -> None:
    stop_tasks = []
    for container in containers:
        logger.info(f'Stopping container {container.id=} {challenge_name=} {team_id=}')
        stop_tasks.append(container.stop(t=config.DOCKER_STOP_TIMEOUT_SECONDS))

    await asyncio.gather(*stop_tasks, return_exceptions=True)
    await asyncio.gather(*[c.delete(force=True) for c in containers], return_exceptions=True)
    logger.info(f'Removed {len(containers)} containers.')


async def stop_instance(challenge_name: str, team_id: str) -> protocol.RCTFInstanceDetails:
    async with instance_lock(challenge_name, team_id) as acquired:
        if not acquired:
            raise NOT_ACQUIRED_ERROR

        docker = get_docker()
        instance_containers = await get_containers(docker, challenge_name, team_id)
        if not instance_containers:
            raise HTTPException(status_code=404, detail='Instance not found')

        instance_id: str | None = None
        if instance_containers:
            try:
                details = await instance_containers[0].show()
                instance_id = details['Config']['Labels'].get(ContainerLabels.INSTANCE_ID)
            except DockerError:
                pass

        networks_to_remove, volumes_to_remove = await _collect_instance_resources(instance_containers)
        await _stop_and_delete_containers(instance_containers, challenge_name, team_id)
        await asyncio.gather(
            cleanup_networks(docker, list(networks_to_remove)),
            cleanup_volumes(docker, list(volumes_to_remove)),
        )

        if instance_id:
            await delete_instance_expiration(instance_id)

        return protocol.RCTFInstanceDetails(
            status=protocol.InstanceStatus.STOPPED,
            endpoints=None,
            time_left_milliseconds=None,
        )


def _get_container_status(detail: dict) -> protocol.InstanceStatus:
    state = detail['State']
    container_status = state.get('Status', '')

    if container_status in {'removing', 'paused', 'exited', 'dead'}:
        return protocol.InstanceStatus.ERRORED

    if container_status != 'running':
        return protocol.InstanceStatus.STARTING

    health = state.get('Health')
    if health:
        health_status = health.get('Status', '')
        if health_status == 'unhealthy':
            return protocol.InstanceStatus.ERRORED
        if health_status in ('starting', 'none'):
            return protocol.InstanceStatus.STARTING

    return protocol.InstanceStatus.RUNNING


def _get_highest_status(statuses: list[protocol.InstanceStatus]) -> protocol.InstanceStatus:
    if protocol.InstanceStatus.ERRORED in statuses:
        return protocol.InstanceStatus.ERRORED
    if protocol.InstanceStatus.STARTING in statuses:
        return protocol.InstanceStatus.STARTING
    return protocol.InstanceStatus.RUNNING


async def get_instance(challenge_name: str, team_id: str) -> protocol.RCTFInstanceDetails:
    docker = get_docker()
    containers = await get_containers(docker, challenge_name, team_id)

    status = protocol.InstanceStatus.STOPPED
    expires_at: int | None = None
    indexed_endpoints: list[tuple[int, protocol.RCTFInstanceDetails.Endpoint]] = []

    details = await _show_containers(containers)
    if details:
        first_labels = details[0]['Config']['Labels']
        expires_at = await get_effective_expiration(first_labels)

        statuses: list[protocol.InstanceStatus] = []
        for detail in details:
            labels = detail['Config']['Labels']
            statuses.append(_get_container_status(detail))
            indexed_endpoints.extend(extract_exposes(labels))

        status = _get_highest_status(statuses)

    endpoints = [endpoint for _, endpoint in sorted(indexed_endpoints, key=lambda item: item[0])]
    return protocol.RCTFInstanceDetails(
        status=status,
        endpoints=endpoints if expires_at else None,
        time_left_milliseconds=max(0, expires_at - timestamp_milliseconds()) if expires_at else None,
    )


async def renew_instance(form: protocol.RCTFRenewInstanceForm) -> protocol.RCTFInstanceDetails:
    async with instance_lock(form.challenge_integration_id, form.team_id) as acquired:
        if not acquired:
            raise NOT_ACQUIRED_ERROR

        docker = get_docker()
        containers = await get_containers(docker, form.challenge_integration_id, form.team_id)
        if not containers:
            raise HTTPException(status_code=404, detail='Instance not found')

        now = timestamp_milliseconds()
        new_expires_at = now + form.timeout_milliseconds

        details = await _show_containers(containers)
        if not details:
            raise HTTPException(status_code=404, detail='Instance not found')

        first_labels = details[0]['Config']['Labels']
        instance_id: str | None = first_labels.get(ContainerLabels.INSTANCE_ID)
        if not instance_id:
            raise HTTPException(status_code=500, detail='Instance ID not found in container labels')

        indexed_endpoints: list[tuple[int, protocol.RCTFInstanceDetails.Endpoint]] = []
        statuses: list[protocol.InstanceStatus] = []

        for detail in details:
            labels = detail['Config']['Labels']
            statuses.append(_get_container_status(detail))
            indexed_endpoints.extend(extract_exposes(labels))

        await set_instance_expiration(instance_id, new_expires_at, now)

        status = _get_highest_status(statuses)
        logger.info(
            f'Renewed instance {form.challenge_integration_id=} {form.team_id=} '
            f'{instance_id=} new_expires_at={new_expires_at}'
        )

        endpoints = [endpoint for _, endpoint in sorted(indexed_endpoints, key=lambda item: item[0])]
        return protocol.RCTFInstanceDetails(
            status=status,
            time_left_milliseconds=new_expires_at - timestamp_milliseconds(),
            endpoints=endpoints,
        )
