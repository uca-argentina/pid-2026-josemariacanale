FROM node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Clerk expone la clave pública en el bundle: tiene que estar al hacer el build.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
