FROM debian:bookworm

WORKDIR /app
RUN apt update && apt install -y \
    nodejs \
    npm

COPY package.json /app/package.json

RUN npm install

COPY . /app
RUN npm run prisma generate

EXPOSE 3000
CMD ["npm", "start"]