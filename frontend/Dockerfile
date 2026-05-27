FROM node:20-alpine
WORKDIR /usr/src/app

COPY package.json package-lock.json* tsconfig.json next-env.d.ts ./
COPY postcss.config.js tailwind.config.js ./
COPY src ./src

RUN npm install
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
