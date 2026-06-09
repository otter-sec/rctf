from instancer.core.config import config
from instancer.core.instancer.const import ContainerLabels
from instancer.protocol import types as protocol
from instancer.util.logger import logger


SEPARATOR = ';'
KIND_TO_PORT = {
    protocol.ExposeKind.HTTP: config.TRAEFIK_HTTP_PORT,
    protocol.ExposeKind.HTTPS: config.TRAEFIK_HTTPS_PORT,
    protocol.ExposeKind.TCP: config.TRAEFIK_TCP_PORT,
    protocol.ExposeKind.TCP_SSL: config.TRAEFIK_TCP_PORT,
}


def expose_ports(
    labels: dict[str, str],
    svc_name: str,
    exposes: dict[str, list[protocol.InstancerExpose]],  # container: exposes
    instance_id: str,
    routing_network: str | None,
    global_indices: list[int],
) -> tuple[list[str], list[protocol.RCTFInstanceDetails.Endpoint]]:
    to_expose = exposes.get(svc_name, [])

    # We don't support raw tcp expose due to SNI routing
    for exp in to_expose:
        if exp.kind != protocol.ExposeKind.TCP:
            continue
        exp.kind = protocol.ExposeKind.TCP_SSL

    labels[ContainerLabels.EXPOSED_KINDS] = SEPARATOR.join(k.kind for k in to_expose)
    labels[ContainerLabels.EXPOSED_INDICES] = SEPARATOR.join(str(i) for i in global_indices)
    if not to_expose or not routing_network:
        labels[ContainerLabels.EXPOSED_HOSTNAMES] = ''
        return [], []

    hosts: list[str] = []
    exposed: list[protocol.RCTFInstanceDetails.Endpoint] = []

    labels['traefik.enable'] = 'true'
    labels['traefik.docker.network'] = routing_network

    for i, expose in enumerate(to_expose):
        router_name = f'{config.PREFIX}-{instance_id}-{svc_name}-{i}'
        host = f'{expose.host_prefix}-{instance_id}.{config.INSTANCES_HOST}'.replace(SEPARATOR, '')

        hosts.append(host)
        exposed.append(
            protocol.RCTFInstanceDetails.Endpoint(
                kind=expose.kind,
                host=host,
                port=KIND_TO_PORT[expose.kind],
            )
        )

        match expose.kind:
            # TCP is not supported

            case protocol.ExposeKind.TCP_SSL:
                labels[f'traefik.tcp.routers.{router_name}.rule'] = f'HostSNI(`{host}`)'
                labels[f'traefik.tcp.routers.{router_name}.entrypoints'] = config.TRAEFIK_TCP_ENTRYPOINT
                labels[f'traefik.tcp.routers.{router_name}.service'] = router_name
                labels[f'traefik.tcp.routers.{router_name}.tls'] = 'true'
                labels[f'traefik.tcp.services.{router_name}.loadbalancer.server.port'] = str(expose.container_port)

            case protocol.ExposeKind.HTTP:
                labels[f'traefik.http.routers.{router_name}.rule'] = f'Host(`{host}`)'
                labels[f'traefik.http.routers.{router_name}.entrypoints'] = config.TRAEFIK_HTTP_ENTRYPOINT
                labels[f'traefik.http.routers.{router_name}.service'] = router_name
                labels[f'traefik.http.services.{router_name}.loadbalancer.server.port'] = str(expose.container_port)

            case protocol.ExposeKind.HTTPS:
                labels[f'traefik.http.routers.{router_name}.rule'] = f'Host(`{host}`)'
                labels[f'traefik.http.routers.{router_name}.entrypoints'] = config.TRAEFIK_HTTPS_ENTRYPOINT
                labels[f'traefik.http.routers.{router_name}.tls'] = 'true'
                labels[f'traefik.http.routers.{router_name}.service'] = router_name
                labels[f'traefik.http.services.{router_name}.loadbalancer.server.port'] = str(expose.container_port)

                has_http_expose = any(
                    any(exp.kind == protocol.ExposeKind.HTTP and exp.host_prefix == expose.host_prefix for exp in k)
                    for k in exposes.values()
                )
                if not has_http_expose:
                    redirect_router_name = f'{router_name}-redirect'
                    labels[f'traefik.http.routers.{redirect_router_name}.rule'] = f'Host(`{host}`)'
                    labels[f'traefik.http.routers.{redirect_router_name}.entrypoints'] = config.TRAEFIK_HTTP_ENTRYPOINT
                    labels[f'traefik.http.routers.{redirect_router_name}.middlewares'] = (
                        config.TRAEFIK_PERMANENT_REDIRECT_MIDDLEWARE_NAME
                    )

    labels[ContainerLabels.EXPOSED_HOSTNAMES] = SEPARATOR.join(hosts)
    return hosts, exposed


def extract_exposes(labels: dict[str, str]) -> list[tuple[int, protocol.RCTFInstanceDetails.Endpoint]]:
    raw_exposed_kinds = labels.get(ContainerLabels.EXPOSED_KINDS, '')
    raw_exposed_hosts = labels.get(ContainerLabels.EXPOSED_HOSTNAMES, '')
    if not raw_exposed_kinds or not raw_exposed_hosts:
        return []

    exposed_kinds = raw_exposed_kinds.split(SEPARATOR)
    exposed_hosts = raw_exposed_hosts.split(SEPARATOR)
    if len(exposed_hosts) != len(exposed_kinds):
        logger.warning(f'Exposed hosts and kinds count mismatch: {len(exposed_hosts)=} {len(exposed_kinds)=}')
        return []

    raw_indices = labels.get(ContainerLabels.EXPOSED_INDICES, '')
    indices = [int(i) for i in raw_indices.split(SEPARATOR)] if raw_indices else []
    if len(indices) != len(exposed_hosts):
        indices = list(range(len(exposed_hosts)))

    result: list[tuple[int, protocol.RCTFInstanceDetails.Endpoint]] = []
    for index, kind, host in zip(indices, exposed_kinds, exposed_hosts, strict=True):
        kind_mapped = protocol.ExposeKind(kind)
        result.append(
            (
                index,
                protocol.RCTFInstanceDetails.Endpoint(
                    kind=kind_mapped,
                    host=host,
                    port=KIND_TO_PORT[kind_mapped],
                ),
            )
        )

    return result
