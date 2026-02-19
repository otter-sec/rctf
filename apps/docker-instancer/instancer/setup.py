from contextlib import asynccontextmanager
from http import HTTPStatus
from typing import TYPE_CHECKING, Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import ORJSONResponse
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
    default_response_class=ORJSONResponse,
)
app.include_router(instances_router)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> ORJSONResponse:
    return ORJSONResponse(
        status_code=exc.status_code,
        content=protocol.RCTFInstancerError(message=exc.detail).model_dump(mode='json'),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> ORJSONResponse:
    return ORJSONResponse(
        status_code=422,
        content=protocol.RCTFInstancerError(
            message=f'Validation error: {exc.errors()}',
        ).model_dump(mode='json'),
    )


@app.exception_handler(Exception)
async def exception_handler(_: Request, exc: Exception) -> ORJSONResponse:
    logger.opt(exception=exc).error('Unhandled error')
    return ORJSONResponse(
        status_code=HTTPStatus.INTERNAL_SERVER_ERROR.value,
        content=protocol.RCTFInstancerError(message='Internal Server Error').model_dump(mode='json'),
    )
