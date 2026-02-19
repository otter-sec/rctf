import logging
import sys
from typing import Any

from loguru import logger
from uvicorn.config import LOGGING_CONFIG

from instancer.core.config import config


class LoguruHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelname

        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            if frame.f_back is None:
                break

            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level,
            record.getMessage(),
        )


def _filter_min_level(record: dict) -> bool:
    current_level_name: str = 'DEBUG' if config.DEV_ENV else 'INFO'
    current_level: int = logger.level(current_level_name).no
    return record['level'].no >= current_level


def _filter_stderr(record: dict) -> bool:
    return _filter_min_level(record)


def _filter_stdout(record: dict) -> bool:
    record_no: int = record['level'].no
    error_no: int = logger.level('ERROR').no
    return _filter_min_level(record) and record_no != error_no


def init_logger() -> None:
    loguru_handler = LoguruHandler()
    logging.basicConfig(handlers=[loguru_handler])

    for key in LOGGING_CONFIG['handlers']:
        handler_conf = LOGGING_CONFIG['handlers'][key]

        handler_conf['class'] = 'instancer.util.logger.LoguruHandler'
        if 'stream' in handler_conf:
            handler_conf.pop('stream')

    fmt = (
        '<level>{time}</level> | <level>{level: <8}</level> | '
        '<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - '
        '<level>{message}</level>'
    )

    logger.remove()

    handler_1: Any = {'sink': sys.stderr, 'level': 'ERROR', 'format': fmt, 'filter': _filter_stderr}
    handler_2: Any = {'sink': sys.stdout, 'format': fmt, 'filter': _filter_stdout}
    logger.configure(
        handlers=[  # type: ignore[invalid-argument-type]
            handler_1,
            handler_2,
        ]
    )


init_logger()
