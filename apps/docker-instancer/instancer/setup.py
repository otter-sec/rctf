from contextlib import asynccontextmanager
from http import HTTPStatus
from typing import TYPE_CHECKING, Any

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException

from instancer.core.cache import redis
from instancer.protocol import types as protocol
from instancer.routes.v1.instances import router as instances_router
from instancer.util.logger import logger


if TYPE_CHECKING:
    from collections.abc import AsyncGenerator


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, Any]:
    await redis.ping()

    try:
        yield
    finally:
        await redis.close()
        await redis.connection_pool.disconnect()


app = FastAPI(
    title='docker-instancer',
    description='https://github.com/es3n1n/tiny-instancer',
    version='1.0.0',
    redoc_url=None,
    lifespan=lifespan,
)
app.include_router(instances_router)


def _error_response(status_code: int, message: str) -> Response:
    return Response(
        status_code=status_code,
        content=protocol.RCTFInstancerError(message=message).model_dump_json(),
        media_type='application/json',
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> Response:
    return _error_response(exc.status_code, exc.detail)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> Response:
    return _error_response(422, f'Validation error: {exc.errors()}')


@app.exception_handler(Exception)
async def exception_handler(_: Request, exc: Exception) -> Response:
    logger.opt(exception=exc).error('Unhandled error')
    return _error_response(HTTPStatus.INTERNAL_SERVER_ERROR.value, 'Internal Server Error')
