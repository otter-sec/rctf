import asyncio
from http import HTTPStatus

from aiodocker import Docker, DockerError
from aiodocker.networks import DockerNetwork
from fastapi import HTTPException

from instancer.core.config import config
from instancer.core.instancer.const import ContainerLabels
from instancer.protocol import types as protocol
from instancer.util.logger import logger


OUT_OF_SUBNETS_ERROR = HTTPException(
    status_code=500,
    detail='Daemon has run out of available subnets for creating networks. Contact admins.',
)


async def _get_network_safe(docker: Docker, name: str) -> DockerNetwork | None:
    try:
        return await docker.networks.get(name)
    except DockerError as err:
        if err.status != HTTPStatus.NOT_FOUND:
            logger.opt(exception=err).warning(f'Failed to fetch network during cleanup: {name}')
        return None


async def _cleanup_single_network(network: DockerNetwork, name: str) -> None:
    details = await network.show()
    containers = details.get('Containers') or {}

    if containers:
        disconnect_tasks = []
        for conn in containers.values():
            logger.info(f'Disconnecting container {conn["Name"]} from network {name} during cleanup')
            disconnect_tasks.append(network.disconnect({'Container': conn['Name'], 'Force': True}))
        await asyncio.gather(*disconnect_tasks, return_exceptions=True)

    await network.delete()


async def cleanup_networks(docker: Docker, names: list[str]) -> None:
    if not names:
        return

    networks = await asyncio.gather(*[_get_network_safe(docker, name) for name in names])

    cleanup_tasks = []
    for name, network in zip(names, networks, strict=True):
        if network is not None:
            cleanup_tasks.append(_cleanup_single_network(network, name))

    if cleanup_tasks:
        await asyncio.gather(*cleanup_tasks, return_exceptions=True)


async def _create_network(
    docker: Docker, name: str, driver: str, labels: dict[str, str], *, internal: bool
) -> DockerNetwork:
    try:
        return await docker.networks.create(
            {
                'Name': name,
                'Driver': driver,
                'Internal': internal,
                'Labels': labels,
            }
        )
    except DockerError as err:
        if err.status == HTTPStatus.BAD_REQUEST and 'fully subnetted' in (err.message or ''):
            # See readme for network pool configuration
            raise OUT_OF_SUBNETS_ERROR from err
        raise


async def create_networks(
    docker: Docker, networks: dict[str, protocol.Network], labels: dict[str, str]
) -> dict[str, str]:
    if not networks:
        return {}

    instance_id = labels[ContainerLabels.INSTANCE_ID]
    network_items = list(networks.items())

    network_names = [f'{config.PREFIX}-{name}-{instance_id}' for name, _ in network_items]
    create_tasks = [
        _create_network(docker, net_name, net_config.driver, labels, internal=net_config.internal)
        for net_name, (_, net_config) in zip(network_names, network_items, strict=True)
    ]

    try:
        await asyncio.gather(*create_tasks)
    except Exception:
        await cleanup_networks(docker, network_names)
        raise

    return {
        expected_name: actual_name for (expected_name, _), actual_name in zip(network_items, network_names, strict=True)
    }


async def create_routing_network(
    docker: Docker,
    instance_id: str,
    i: int,
    labels: dict[str, str],
) -> str:
    network_name = f'{config.PREFIX}-{instance_id}-routing-{i}'

    network = await _create_network(docker, network_name, 'bridge', labels, internal=True)
    await network.connect(
        {
            'Container': config.TRAEFIK_CONTAINER_NAME,
        }
    )

    return network_name
