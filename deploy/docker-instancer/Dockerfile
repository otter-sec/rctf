FROM ghcr.io/astral-sh/uv:python3.14-trixie-slim

RUN apt-get update && apt-get install -yq --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV UV_TOOL_BIN_DIR=/usr/local/bin

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=apps/docker-instancer/uv.lock,target=uv.lock \
    --mount=type=bind,source=apps/docker-instancer/pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-dev

COPY apps/docker-instancer/pyproject.toml apps/docker-instancer/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev

COPY apps/docker-instancer/instancer ./instancer/

ENV PATH="/app/.venv/bin:$PATH"
ENTRYPOINT []
CMD ["python3", "-m", "instancer"]
