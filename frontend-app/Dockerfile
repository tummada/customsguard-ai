FROM nginx:alpine

RUN adduser --system --uid 1001 appuser

COPY --chown=appuser:0 ./dist /usr/share/nginx/html
COPY --chown=appuser:0 ./nginx.conf /etc/nginx/conf.d/default.conf

# Nginx needs write access to these dirs when running as non-root
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx \
    && chown -R appuser:0 /var/cache/nginx /var/run /var/log/nginx

USER appuser
EXPOSE 80
