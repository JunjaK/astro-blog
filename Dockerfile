FROM nginx:alpine AS runtime

ENV TZ="Asia/Seoul"

COPY ./nginx.conf /etc/nginx/nginx.conf
COPY --from=build ./dist /usr/share/nginx/html
EXPOSE 4321
