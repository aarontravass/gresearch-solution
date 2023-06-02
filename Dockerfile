FROM node:16-alpine
WORKDIR /app
COPY package*.json /app/
RUN npm i
COPY . /app/
CMD npm run start