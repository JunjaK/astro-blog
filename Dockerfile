FROM ubuntu/nginx:1.18-22.04_beta

ENV TZ="Asia/Seoul"

COPY ./nginx.conf /etc/nginx/nginx.conf
COPY ./dist /var/www/html
