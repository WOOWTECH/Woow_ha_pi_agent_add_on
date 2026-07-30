ARG BUILD_FROM=ghcr.io/hassio-addons/debian-base:9.1.0
FROM ${BUILD_FROM}

ENV \
    LANG=C.UTF-8 \
    NODE_ENV=production \
    npm_config_cache=/tmp/npm-cache \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    PI_TELEMETRY=0 \
    PI_SKIP_VERSION_CHECK=1

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Node.js 22 (pi-web requires >=22.19.0). glibc-based Debian base is required
# because Bun / pi native modules will not run on Alpine musl.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg jq nginx \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
       | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
       > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /etc/nginx/sites-enabled/default /etc/nginx/conf.d/*

# pi-web ships pre-built .next/ in the npm tarball; @earendil-works/pi-coding-agent
# is a transitive dep, so no separate agent daemon is needed.
#
# Pinned: upstream ships absolute-path assets and 40+ /api/* routes that the
# ingress shim rewrites in nginx.conf. A floating `@latest` means an upstream
# refactor of _next chunk names, RSC prefetch shape, or a new /api/* route can
# silently regress the shim without any local code change. Bump manually after
# validating a new upstream release doesn't break Ingress.
ARG PI_WEB_VERSION=0.8.4
RUN npm install -g --omit=dev "@agegr/pi-web@${PI_WEB_VERSION}" \
    && rm -rf /tmp/npm-cache

COPY rootfs/ /

ARG BUILD_ARCH=amd64
ARG BUILD_VERSION \
    BUILD_DATE \
    BUILD_DESCRIPTION \
    BUILD_NAME \
    BUILD_REF \
    BUILD_REPOSITORY

LABEL \
    io.hass.name="${BUILD_NAME}" \
    io.hass.description="${BUILD_DESCRIPTION}" \
    io.hass.arch="${BUILD_ARCH}" \
    io.hass.type="addon" \
    io.hass.version="${BUILD_VERSION}" \
    maintainer="WOOWTECH <woowtech@designsmart.com.tw>" \
    org.opencontainers.image.title="${BUILD_NAME}" \
    org.opencontainers.image.description="${BUILD_DESCRIPTION}" \
    org.opencontainers.image.vendor="WOOWTECH" \
    org.opencontainers.image.authors="WOOWTECH <woowtech@designsmart.com.tw>" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.url="https://github.com/WOOWTECH" \
    org.opencontainers.image.source="https://github.com/${BUILD_REPOSITORY}" \
    org.opencontainers.image.documentation="https://github.com/${BUILD_REPOSITORY}/blob/main/README.md" \
    org.opencontainers.image.created=${BUILD_DATE} \
    org.opencontainers.image.revision=${BUILD_REF} \
    org.opencontainers.image.version=${BUILD_VERSION}
