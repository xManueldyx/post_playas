FROM node:22-alpine
WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY package.json package-lock.json* tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npm install
RUN npx prisma generate

EXPOSE 4000
CMD ["npm", "run", "dev"]
