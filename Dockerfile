FROM node:16-alpine as builder
WORKDIR /app
COPY . .
RUN yarn install --inline-builds
RUN yarn build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/explorer.conf
RUN rm /etc/nginx/conf.d/default.conf
EXPOSE 80
