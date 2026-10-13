FROM node:24-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# prisma/ y tsconfig.json antes de npm ci: el postinstall corre `prisma generate`, que sin
# tsconfig.json escribe los imports con `.ts` y el `dist/` compilado no arranca.
COPY package*.json prisma.config.ts tsconfig.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build
# ponytail: devDependencies quedan en la imagen porque `prisma migrate deploy` es una dev dependency; podar si el tamaño importa.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
