from enum import StrEnum

from instancer.core.config import config


class ContainerLabels(StrEnum):
    # Set in all resources
    MANAGED_BY = 'io.es3n1n.managed_by'
    INSTANCE_ID = 'io.es3n1n.instancer.instance_id'
    EXPIRES_AT = 'io.es3n1n.instancer.expires_at'
    CHALLENGE = 'io.es3n1n.instancer.challenge'
    TEAM_ID = 'io.es3n1n.instancer.team_id'
    STARTED_AT = 'io.es3n1n.instancer.started_at'

    # Set only in containers from `traefik.py`
    EXPOSED_KINDS = 'io.es3n1n.instancer.exposed_kinds'
    EXPOSED_HOSTNAMES = 'io.es3n1n.instancer.hostnames'


def get_search_filters(challenge_name: str, team_id: str) -> dict[str, dict | list | str]:
    return {
        'label': [
            f'{ContainerLabels.MANAGED_BY}={config.DOCKER_MANAGER_NAME}',
            f'{ContainerLabels.CHALLENGE}={challenge_name}',
            f'{ContainerLabels.TEAM_ID}={team_id}',
        ]
    }


def get_common_labels(
    instance_id: str, expires_at: int, challenge_id: str, team_id: str, started_at: int
) -> dict[str, str]:
    return {
        ContainerLabels.MANAGED_BY: config.DOCKER_MANAGER_NAME,
        ContainerLabels.INSTANCE_ID: instance_id,
        ContainerLabels.EXPIRES_AT: str(expires_at),
        ContainerLabels.CHALLENGE: challenge_id,
        ContainerLabels.TEAM_ID: team_id,
        ContainerLabels.STARTED_AT: str(started_at),
    }
