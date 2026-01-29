# Etapa 1: Construcción (Vite usa dist)
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa 2: Servidor de producción
FROM nginx:stable-alpine
# Copiamos la configuración personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copiamos los archivos de Vite (tu carpeta es 'dist')
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]