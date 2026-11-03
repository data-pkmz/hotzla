# ==========================================
# ÉTAPE 1 : Construction du Front-end (React)
# ==========================================
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
COPY frontend/package*.json ./frontend/
# Si tu utilises des .tgz globaux ou locaux, tu peux les copier ici
COPY *.tgz ./

# Installation des dépendances pour le front
RUN npm install

# Copie du code source du front et build
COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

# ==========================================
# ÉTAPE 2 : Construction du Back-end
# ==========================================
FROM node:18-alpine AS backend-build
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY *.tgz ./

# Installation des dépendances (en mode hors-ligne si tu tcharges les .tgz)
RUN npm install --omit=dev

# Copie du code source du backend
COPY backend/ ./backend/

# ==========================================
# ÉTAPE 3 : Image Finale de Production (Nginx + Node)
# ==========================================
FROM node:18-alpine

# Installation de Nginx pour servir le front-end statique
RUN apk add --no-cache nginx

WORKDIR /app

# Copie des modules et du code du backend depuis l'étape précédente
COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/backend ./backend
COPY package.json ./

# Copie des fichiers statiques compilés du front-end vers le dossier public de Nginx
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Configuration par défaut de Nginx (optionnel, ou tu peux configurer ton back pour servir le front)
EXPOSE 3000 80

# Script de lancement combiné (ou lancement de ton back qui s'occupe de tout)
CMD ["node", "backend/src/index.js"]