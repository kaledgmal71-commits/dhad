FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
ARG SHA
RUN mkdir -p /app /home/node/data && chown -R node:node /app /home/node
USER node
WORKDIR /app
RUN curl -fsSL https://codeload.github.com/kaledgmal71-commits/dhad/tar.gz/${SHA} | tar xz --strip-components=1 \
 && mv apps/jami jami && mv deploy/jami-space space && rm -rf apps deploy
WORKDIR /app/jami
RUN npm install --no-audit --no-fund && npm run build
WORKDIR /app/space
RUN npm install --no-audit --no-fund
ENV PORT=7860 APP_DIR=/app/jami DATA_DIR=/home/node/data NODE_ENV=production
EXPOSE 7860
CMD ["node", "start.mjs"]
