FROM keymetrics/pm2:12-alpine

WORKDIR /usr/src/forstream-live

COPY src src/
COPY assets assets/
COPY package.json .
COPY ecosystem.config.js .

ENV NPM_CONFIG_LOGLEVEL warn

RUN apk update && apk upgrade

RUN npm install --production

EXPOSE 3000

CMD [ "pm2-runtime", "start", "ecosystem.config.js" ]
