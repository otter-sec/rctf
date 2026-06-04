import asyncio

from aiodocker import Docker, DockerError
from aiodocker.containers import DockerContainer

from instancer.core.config import config
from instancer.core.instancer.const import ContainerLabels, get_search_filters
from instancer.core.instancer.traefik import expose_ports
from instancer.core.instancer.volumes import parse_volume_mounts
from instancer.protocol import types as protocol
from instancer.util.logger import logger
from instancer.util.nanos import parse_memory_bytes, parse_nano_sec


def merge(left: dict[str, str], right: dict[str, str]) -> dict[str, str]:
    left.update(right)
    return left


async def create_container(  # noqa: PLR0913
    docker: Docker,
    challenge_integration_id: str,
    exposes: dict[str, list[protocol.InstancerExpose]],
    networks_created: dict[str, str],
    volumes_created: dict[str, str],
    common_labels: dict[str, str],
    svc_name: str,
    container: protocol.Service,
    routing_network: str | None,
) -> tuple[DockerContainer, list[protocol.RCTFInstanceDetails.Endpoint]]:
    labels = common_labels.copy()
    instance_id = common_labels[ContainerLabels.INSTANCE_ID]
    actual_svc_name = f'{config.PREFIX}-{challenge_integration_id}-{svc_name}-{instance_id}'

    _, exposed = expose_ports(labels, svc_name, exposes, instance_id, routing_network)

    endpoints_config: dict[str, dict] = {networks_created[network]: {} for network in container.networks}
    volume_mounts = parse_volume_mounts(container.volumes, volumes_created)
    if routing_network:
        endpoints_config[routing_network] = {}

    logger.info(f'Spinning up container {actual_svc_name=}')
    return (
        await docker.containers.create(
            config={
                'Image': container.image,
                'Hostname': container.hostname or svc_name,
                'Env': [f'{k}={v}' for k, v in container.environment.items()],
                'Cmd': container.command.split() if container.command else None,
                'Entrypoint': container.entrypoint,
                'WorkingDir': container.working_dir,
                'User': container.user,
                'NetworkingConfig': {
                    'EndpointsConfig': endpoints_config,
                },
                'ExposedPorts': {port: {} for port in container.expose},
                'Healthcheck': {
                    'Test': container.healthcheck.test,
                    'Interval': parse_nano_sec(container.healthcheck.interval),
                    'Timeout': parse_nano_sec(container.healthcheck.timeout),
                    'Retries': container.healthcheck.retries,
                    'StartPeriod': parse_nano_sec(container.healthcheck.start_period),
                }
                if container.healthcheck
                else None,
                'Labels': merge(container.labels, labels),
                'HostConfig': {
                    'NetworkMode': container.network_mode or ('bridge' if endpoints_config else 'none'),
                    'Mounts': volume_mounts or None,
                    'Dns': container.dns,
                    'DnsOptions': container.dns_opt,
                    'DnsSearch': container.dns_search,
                    'ExtraHosts': container.extra_hosts,
                    'Tmpfs': container.tmpfs,
                    'ShmSize': container.shm_size,
                    'ReadonlyRootfs': container.read_only,
                    'Privileged': container.privileged,
                    'SecurityOpt': container.security_opt,
                    'CapAdd': container.cap_add,
                    'CapDrop': container.cap_drop,
                    'Memory': parse_memory_bytes(container.mem_limit),
                    'MemorySwap': parse_memory_bytes(container.mem_limit),
                    'NanoCpus': int(container.cpus * 1e9),
                    'PidsLimit': container.pids_limit,
                    'Ulimits': [
                        {
                            'Name': name,
                            'Soft': ulimit.soft,
                            'Hard': ulimit.hard,
                        }
                        for name, ulimit in container.ulimits.items()
                    ],
                    'Sysctls': container.sysctls or None,
                    'RestartPolicy': {
                        'Name': container.restart,
                    },
                },
            },
            name=actual_svc_name,
        ),
        exposed,
    )


async def get_containers(
    docker: Docker,
    challenge_name: str,
    team_id: str,
    *,
    limit: int | None = None,
    running_only: bool = False,
) -> list[DockerContainer]:
    kwargs: dict[str, int] = {}
    if limit is not None:
        kwargs['limit'] = limit
    try:
        return await docker.containers.list(
            all=not running_only,
            filters=get_search_filters(challenge_name, team_id),
            **kwargs,
        )
    except DockerError as err:
        logger.opt(exception=err).error(f'Error getting containers: {challenge_name=} {team_id=}')
        return []


async def is_running(docker: Docker, challenge_name: str, team_id: str) -> bool:
    return bool(await get_containers(docker, challenge_name, team_id, running_only=True, limit=1))


async def cleanup_containers(containers: list[DockerContainer]) -> None:
    if not containers:
        return

    await asyncio.gather(*[container.delete(force=True) for container in containers], return_exceptions=True)
