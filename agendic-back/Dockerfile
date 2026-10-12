FROM node:24-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# prisma/ antes de npm ci: el postinstall corre `prisma generate`.
COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build
# ponytail: devDependencies quedan en la imagen porque `prisma migrate deploy` es una dev dependency; podar si el tamaño importa.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
