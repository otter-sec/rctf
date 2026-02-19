import asyncio
from contextlib import suppress

from aiodocker import Docker, DockerError
from aiodocker.docker import DockerContainer
from fastapi import HTTPException

from instancer.core.config import config
from instancer.core.instancer.const import ContainerLabels
from instancer.core.instancer.networks import cleanup_networks
from instancer.core.instancer.volumes import cleanup_volumes
from instancer.core.instances import get_docker, stop_instance
from instancer.util.expiration import get_effective_expirations_batch
from instancer.util.logger import logger
from instancer.util.time import timestamp_milliseconds


try:
    from uvloop import run  # type: ignore[import-not-found]
except ImportError:
    from asyncio import run


async def _get_container_details_safe(container: DockerContainer) -> dict | None:
    try:
        return await container.show()
    except DockerError:
        return None


async def _stop_expired_instance(challenge: str, team_id: str, container_id: str) -> None:
    try:
        await stop_instance(challenge, team_id)
    except HTTPException as err:
        logger.opt(exception=err).warning(
            f'Pruner failed to stop expired container {container_id=} via stop_instance, will try again'
        )
    except DockerError as err:
        logger.opt(exception=err).warning(f'Pruner failed to remove expired container {container_id=}')


async def _prune_instances(docker: Docker, now: int) -> None:
    containers = await docker.containers.list(
        all=True,
        filters={
            'label': [
                f'{ContainerLabels.MANAGED_BY}={config.DOCKER_MANAGER_NAME}',
            ],
        },
    )

    if not containers:
        return

    details_list = await asyncio.gather(*[_get_container_details_safe(c) for c in containers])
    labels_list = [d['Config']['Labels'] if d else {} for d in details_list]
    expirations = await get_effective_expirations_batch(labels_list)

    instances_to_stop: dict[tuple[str, str], str] = {}
    for container, details, expires_at in zip(containers, details_list, expirations, strict=True):
        if details is None or expires_at is None or expires_at > now:
            continue

        labels = details['Config']['Labels']
        challenge = labels[ContainerLabels.CHALLENGE]
        team_id = labels[ContainerLabels.TEAM_ID]
        key = (challenge, team_id)

        if key not in instances_to_stop:
            instances_to_stop[key] = container.id
            logger.info(f'Pruner stopping expired instance {challenge=} {team_id=} {expires_at=} {now=}')

    if instances_to_stop:
        await asyncio.gather(
            *[
                _stop_expired_instance(challenge, team_id, cid)
                for (challenge, team_id), cid in instances_to_stop.items()
            ],
            return_exceptions=True,
        )


async def _get_network_details(docker: Docker, network_id: str) -> dict | None:
    try:
        return await docker._query_json(f'networks/{network_id}', method='GET')  # noqa: SLF001
    except DockerError:
        return None


async def _prune_networks(docker: Docker, now: int) -> None:
    networks = await docker.networks.list(
        filters={
            'label': [
                f'{ContainerLabels.MANAGED_BY}={config.DOCKER_MANAGER_NAME}',
            ],
        }
    )

    if not networks:
        return

    details_list = await asyncio.gather(*[_get_network_details(docker, n['Id']) for n in networks])
    labels_list = [(d.get('Labels') or {}) if d else {} for d in details_list]
    expirations = await get_effective_expirations_batch(labels_list)

    names_to_prune: list[str] = []
    for network, expires_at in zip(networks, expirations, strict=True):
        if expires_at is None or expires_at > now:
            continue

        logger.info(f'Pruning expired network {network["Name"]=} {expires_at=} {now=}')
        names_to_prune.append(network['Name'])

    await cleanup_networks(docker, names_to_prune)


async def _prune_volumes(docker: Docker, now: int) -> None:
    volumes = await docker.volumes.list(
        filters={
            'label': [
                f'{ContainerLabels.MANAGED_BY}={config.DOCKER_MANAGER_NAME}',
            ],
        }
    )

    volume_list = volumes.get('Volumes') or []
    if not volume_list:
        return

    labels_list = [v.get('Labels') or {} for v in volume_list]
    expirations = await get_effective_expirations_batch(labels_list)

    names_to_prune: list[str] = []
    for volume, expires_at in zip(volume_list, expirations, strict=True):
        if expires_at is None or expires_at > now:
            continue

        logger.info(f'Pruning expired volume {volume["Name"]=} {expires_at=} {now=}')
        names_to_prune.append(volume['Name'])

    await cleanup_volumes(docker, names_to_prune)


async def instance_pruner() -> None:
    docker = get_docker()

    while True:
        now = timestamp_milliseconds()
        logger.info('Running instance pruner')
        try:
            await asyncio.gather(
                _prune_instances(docker, now),
                _prune_networks(docker, now),
                _prune_volumes(docker, now),
                return_exceptions=True,
            )
        except Exception as e:  # noqa: BLE001
            logger.opt(exception=e).error('Encountered an error while pruning')
        await asyncio.sleep(config.PRUNNER_INTERVAL_SECONDS)


def pruner_process() -> None:
    with suppress(KeyboardInterrupt):
        run(instance_pruner())
