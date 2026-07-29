ARG BUILD_FROM
FROM ${BUILD_FROM}

ENV LANG=C.UTF-8 \
    NODE_ENV=production \
    npm_config_cache=/tmp/npm-cache \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    PI_TELEMETRY=0 \
    PI_SKIP_VERSION_CHECK=1

# Node.js 22 (pi-web requires >=22.19.0). glibc-based Debian base is required
# because Bun / native modules will not run on Alpine musl.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg jq tini \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
       | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
       > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# pi-web (ships pre-built .next/ in the npm tarball; no `next build` needed).
# The @earendil-works/pi-coding-agent SDK is a transitive dep of pi-web.
RUN npm install -g --omit=dev @agegr/pi-web@latest \
    && rm -rf /tmp/npm-cache

COPY rootfs /

LABEL \
    io.hass.name="Woow HA Pi Agent" \
    io.hass.description="pi-web + pi coding agent, GLM-backed" \
    io.hass.type="addon" \
    io.hass.arch="amd64|aarch64"
