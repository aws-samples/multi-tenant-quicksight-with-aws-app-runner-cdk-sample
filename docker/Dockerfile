FROM public.ecr.aws/bitnami/node:14.17.1

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY . .
EXPOSE 8080

CMD ["node", "-r", "ts-node/register", "app.ts"]
