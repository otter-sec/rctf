from enum import StrEnum
from hmac import compare_digest
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, Field, SecretStr

from instancer.core.config import config


class BaseRCTFRequest(BaseModel):
    rctf_auth_token: SecretStr = Field(validation_alias='rctfAuthToken')

    def check_token(self) -> None:
        if not compare_digest(self.rctf_auth_token.get_secret_value(), config.AUTH_TOKEN.get_secret_value()):
            raise HTTPException(status_code=422, detail='Invalid token')


class ExposeKind(StrEnum):
    TCP = 'tcp'
    TCP_SSL = 'tcp-ssl'
    HTTP = 'http'
    HTTPS = 'https'


class InstanceStatus(StrEnum):
    STOPPED = 'stopped'
    RUNNING = 'running'
    STARTING = 'starting'
    ERRORED = 'errored'


class Ulimit(BaseModel):
    soft: int
    hard: int


class Healthcheck(BaseModel):
    test: list[str]
    interval: str = '30s'
    timeout: str = '10s'
    retries: int = 3
    start_period: str = '0s'


class RestartPolicy(StrEnum):
    NO = 'no'
    ALWAYS = 'always'
    ON_FAILURE = 'on-failure'
    UNLESS_STOPPED = 'unless-stopped'


class Service(BaseModel):
    image: str
    hostname: str | None = None
    environment: dict[str, str] = Field(default_factory=dict)
    command: str | list[str] | None = None
    entrypoint: str | list[str] | None = None
    working_dir: str | None = Field(default=None)
    user: str | None = None
    networks: list[str] = Field(default_factory=list)
    network_mode: str | None = Field(default=None)
    dns: list[str] = Field(default_factory=list)
    dns_opt: list[str] = Field(default_factory=list)
    dns_search: list[str] = Field(default_factory=list)
    extra_hosts: list[str] = Field(default_factory=list)
    expose: list[str] = Field(default_factory=list)
    volumes: list[str] = Field(default_factory=list)
    tmpfs: dict[str, str] = Field(default_factory=dict)
    shm_size: str | None = Field(default=None)
    healthcheck: Healthcheck | None = None
    read_only: bool = Field(default=True)
    privileged: bool = False
    security_opt: list[str] = Field(default_factory=lambda: ['no-new-privileges'])
    cap_add: list[str] = Field(default_factory=list)
    cap_drop: list[str] = Field(default_factory=lambda: ['ALL'])
    mem_limit: str = Field(default='6m')
    cpus: float = 1.0
    pids_limit: int = Field(default=1024)
    ulimits: dict[str, Ulimit] = Field(default_factory=lambda: {'nofile': Ulimit(soft=1024, hard=1024)})
    sysctls: dict[str, str] = Field(default_factory=dict)
    labels: dict[str, str] = Field(default_factory=dict)
    restart: RestartPolicy = RestartPolicy.UNLESS_STOPPED


class NetworkDriver(StrEnum):
    BRIDGE = 'bridge'
    HOST = 'host'
    NONE = 'none'


class Network(BaseModel):
    driver: NetworkDriver = NetworkDriver.BRIDGE
    internal: bool = True
    driver_opts: dict[str, str] = Field(default_factory=dict)


class Volume(BaseModel):
    driver: str = 'local'
    driver_opts: dict[str, str] = Field(default_factory=dict)


class InstancerConfig(BaseModel):
    services: dict[str, Service] = Field(default_factory=dict)
    networks: dict[str, Network] = Field(
        default_factory=lambda: {
            'internal': Network(driver=NetworkDriver.BRIDGE, internal=True),
        }
    )
    volumes: dict[str, Volume] = Field(default_factory=dict)


class InstancerExpose(BaseModel):
    kind: ExposeKind
    host_prefix: str = Field(validation_alias='hostPrefix')
    container_name: str = Field(validation_alias='containerName')
    container_port: int = Field(validation_alias='containerPort')
    should_display: bool = Field(default=True, validation_alias='shouldDisplay')


class RCTFCreateInstanceForm(BaseRCTFRequest):
    kind: Literal['instancerCreateInstanceForm'] = 'instancerCreateInstanceForm'
    team_id: str = Field(validation_alias='teamId')
    challenge_integration_id: str = Field(validation_alias='challengeIntegrationId')
    config: InstancerConfig
    expose: list[InstancerExpose]
    timeout_milliseconds: int = Field(validation_alias='timeoutMilliseconds')


class RCTFGetInstanceForm(BaseRCTFRequest):
    kind: Literal['instancerGetInstanceForm'] = 'instancerGetInstanceForm'
    team_id: str = Field(validation_alias='teamId')
    challenge_integration_id: str = Field(validation_alias='challengeIntegrationId')


class RCTFDeleteInstanceForm(BaseRCTFRequest):
    kind: Literal['instancerDeleteInstanceForm'] = 'instancerDeleteInstanceForm'
    team_id: str = Field(validation_alias='teamId')
    challenge_integration_id: str = Field(validation_alias='challengeIntegrationId')


class RCTFRenewInstanceForm(BaseRCTFRequest):
    kind: Literal['instancerRenewInstanceForm'] = 'instancerRenewInstanceForm'
    team_id: str = Field(validation_alias='teamId')
    challenge_integration_id: str = Field(validation_alias='challengeIntegrationId')
    timeout_milliseconds: int = Field(validation_alias='timeoutMilliseconds')


class RCTFInstanceDetails(BaseModel):
    class Endpoint(BaseModel):
        kind: ExposeKind
        host: str
        port: int

    kind: Literal['instancerInstanceDetails'] = 'instancerInstanceDetails'
    status: InstanceStatus
    time_left_milliseconds: int | None = Field(serialization_alias='timeLeftMilliseconds')
    endpoints: list[Endpoint] | None


class RCTFInstancerError(BaseModel):
    kind: Literal['instancerError'] = 'instancerError'
    message: str
