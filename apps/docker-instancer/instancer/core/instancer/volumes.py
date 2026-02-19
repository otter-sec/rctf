import asyncio
from http import HTTPStatus

from aiodocker import Docker, DockerError
from aiodocker.volumes import DockerVolume
from fastapi import HTTPException

from instancer.core.config import config
from instancer.core.instancer.const import ContainerLabels
from instancer.protocol import types as protocol
from instancer.util.logger import logger


async def _get_volume_safe(docker: Docker, name: str) -> DockerVolume | None:
    try:
        return await docker.volumes.get(name)
    except DockerError as err:
        if err.status != HTTPStatus.NOT_FOUND:
            logger.opt(exception=err).warning(f'Failed to fetch volume during cleanup: {name}')
        return None


async def cleanup_volumes(docker: Docker, names: list[str]) -> None:
    if not names:
        return

    volumes = await asyncio.gather(*[_get_volume_safe(docker, name) for name in names])

    delete_tasks = [volume.delete() for volume in volumes if volume is not None]
    existing_names = [name for name, volume in zip(names, volumes, strict=True) if volume is not None]

    if not delete_tasks:
        return

    logger.info(f'Cleaning up {len(existing_names)} volumes: {existing_names}')
    await asyncio.gather(*delete_tasks, return_exceptions=True)


async def _create_single_volume(
    docker: Docker, name: str, volume_config: protocol.Volume, labels: dict[str, str]
) -> None:
    logger.info(f'Creating volume {name=}')
    await docker.volumes.create(
        {
            'Name': name,
            'Driver': volume_config.driver,
            'DriverOpts': volume_config.driver_opts or None,
            'Labels': labels,
        }
    )


async def create_volumes(docker: Docker, volumes: dict[str, protocol.Volume], labels: dict[str, str]) -> dict[str, str]:
    if not volumes:
        return {}

    instance_id = labels[ContainerLabels.INSTANCE_ID]
    volume_items = list(volumes.items())

    volume_names = [f'{config.PREFIX}-{name}-{instance_id}' for name, _ in volume_items]
    create_tasks = [
        _create_single_volume(docker, vol_name, vol_config, labels)
        for vol_name, (_, vol_config) in zip(volume_names, volume_items, strict=True)
    ]

    try:
        await asyncio.gather(*create_tasks)
    except Exception:
        await cleanup_volumes(docker, volume_names)
        raise

    return {
        expected_name: actual_name for (expected_name, _), actual_name in zip(volume_items, volume_names, strict=True)
    }


def parse_volume_mounts(volume_specs: list[str], volumes_created: dict[str, str]) -> list[dict]:
    binds: list[dict] = []

    for spec in volume_specs:
        parts = spec.split(':')
        if len(parts) < 2:  # noqa: PLR2004
            raise HTTPException(status_code=422, detail=f'Invalid volume spec (missing container path): {spec}')

        volume_name = parts[0]
        container_path = parts[1]
        read_only = len(parts) > 2 and parts[2] == 'ro'  # noqa: PLR2004

        actual_volume_name = volumes_created.get(volume_name)
        if not actual_volume_name:
            raise HTTPException(status_code=422, detail=f'Volume {volume_name} not found in created volumes, skipping')

        binds.append(
            {
                'Type': 'volume',
                'Source': actual_volume_name,
                'Target': container_path,
                'ReadOnly': read_only,
            }
        )

    return binds
