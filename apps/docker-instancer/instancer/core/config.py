from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from instancer.util.fs import ROOT_DIR


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / '.env',
        env_file_encoding='utf-8',
        extra='ignore',
    )

    DEV_ENV: bool = False

    BIND_HOST: str = '0.0.0.0'
    BIND_PORT: int = 1337
    WEB_WORKERS: int = 2
    USE_PROXY_HEADERS: bool = False

    AUTH_TOKEN: SecretStr

    TRAEFIK_CONTAINER_NAME: str = 'ti-traefik'
    TRAEFIK_HTTP_ENTRYPOINT: str = 'web'
    TRAEFIK_HTTP_PORT: int = 80
    TRAEFIK_HTTPS_ENTRYPOINT: str = 'websecure'
    TRAEFIK_HTTPS_PORT: int = 443
    TRAEFIK_TCP_ENTRYPOINT: str = 'tcp'
    TRAEFIK_TCP_PORT: int = 1337
    TRAEFIK_PERMANENT_REDIRECT_MIDDLEWARE_NAME: str = 'permanent-https-redirect@file'

    DOCKER_MANAGER_NAME: str = 'tiny-instancer'
    PREFIX: str = 'ti'

    INSTANCES_HOST: str

    REDIS_HOST: str = 'localhost'
    REDIS_PORT_NUMBER: int = 6379
    REDIS_PASSWORD: SecretStr
    REDIS_LOCK_TIMEOUT_SECONDS: int = 60
    REDIS_LOCK_BLOCKING_TIMEOUT_SECONDS: int = 30

    DOCKER_STOP_TIMEOUT_SECONDS: int = 5

    PRUNNER_INTERVAL_SECONDS: int = 3

    @property
    def cache_connection_url(self) -> str:
        return f'redis://:{self.REDIS_PASSWORD.get_secret_value()}@{self.REDIS_HOST}:{self.REDIS_PORT_NUMBER}'


config = Settings()  # type: ignore[call-arg]
