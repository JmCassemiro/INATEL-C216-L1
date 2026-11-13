FROM node:22-alpine

WORKDIR /app

# Roda como o usuario "node" da imagem, sem privilegios (como a API).
RUN chown node:node /app
USER node

# Dependencias antes do codigo para aproveitar o cache de camadas: enquanto
# package.json e package-lock.json nao mudarem, o npm ci nao roda de novo.
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .

EXPOSE 5173

# Servidor de desenvolvimento do Vite. 0.0.0.0 e necessario para aceitar conexoes
# vindas de fora do container. VITE_API_URL vem do ambiente (compose.yaml).
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
