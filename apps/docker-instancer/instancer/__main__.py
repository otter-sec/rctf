from importlib.util import find_spec
from multiprocessing import Process

from uvicorn import run as uvicorn_run

from instancer.core.config import config
from instancer.core.prunner import pruner_process
from instancer.util.logger import logger


def main() -> None:
    Process(target=pruner_process, daemon=True).start()

    logger.info(f'Starting instancer at {config.BIND_HOST}:{config.BIND_PORT}')
    uvicorn_run(
        'instancer.setup:app',
        host=config.BIND_HOST,
        port=config.BIND_PORT,
        workers=config.WEB_WORKERS,
        # TODO(es3n1n): add winloop support when it can do `create_pipe_connection`
        loop='uvloop' if find_spec('uvloop') else 'asyncio',
        server_header=False,
        forwarded_allow_ips='*',
        proxy_headers=config.USE_PROXY_HEADERS,
    )


if __name__ == '__main__':
    main()
