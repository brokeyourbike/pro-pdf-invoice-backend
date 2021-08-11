FROM node:16.6-alpine

RUN apk add --upgrade --no-cache chromium

WORKDIR /app
ADD . /app

RUN npm install
CMD npm run start

EXPOSE 3000
