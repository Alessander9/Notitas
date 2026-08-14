# Imagen base ligera de Node.js Alpine
FROM node:20-alpine AS runner

WORKDIR /app

# Instalar dependencias del sistema mínimas
ENV NODE_ENV=production
ENV PORT=8080

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production --ignore-scripts

# Copiar código fuente
COPY src/ ./src/

EXPOSE 8080

# Usuario no root para seguridad
USER node

CMD ["node", "src/server.js"]
