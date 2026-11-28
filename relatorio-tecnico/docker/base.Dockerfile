FROM node:22-bookworm

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3-pip python3-venv python-is-python3 \
      tcpdump procps iproute2 curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9 bun \
 && corepack enable \
 && curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh

ENV PIP_BREAK_SYSTEM_PACKAGES=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    CI=1 \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /projeto
