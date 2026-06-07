# ─────────────────────────────────────────────────────────────
# NetBox Topo Vision — standalone Docker image
# Base: nginx:alpine
# Assets and config are baked in; NETBOX_URL / NETBOX_TOKEN are
# injected at runtime via the official nginx envsubst entrypoint
# (NGINX_ENVSUBST_TEMPLATE_SUFFIX/FILTER environment variables).
# ─────────────────────────────────────────────────────────────
FROM nginx:alpine

LABEL org.opencontainers.image.title="netbox-topo-vision" \
      org.opencontainers.image.description="Network topology visualization tool for NetBox" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/Bricebern/netbox-topo-vision"

# Static assets served by NGINX
COPY index.html favicon.ico /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
# NGINX template (envsubst will produce /etc/nginx/conf.d/default.conf at start)
COPY nginx/default.conf /etc/nginx/templates/default.conf.template

ENV NGINX_ENVSUBST_TEMPLATE_SUFFIX=".template" \
    NGINX_ENVSUBST_FILTER="^(NETBOX_URL|NETBOX_TOKEN)$" \
    NETBOX_URL="http://localhost:8000" \
    NETBOX_TOKEN=""

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
    CMD wget -qO- http://127.0.0.1/healthz || exit 1
