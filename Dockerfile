# ==========================================
# STAGE 1: Frontend Build (React)
# ==========================================
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Copy shared-types directory required by frontend
COPY shared-types/ ./shared-types/
COPY *.tgz ./

# Install frontend dependencies
RUN npm install

# Copy frontend source code and build
COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

# ==========================================
# STAGE 2: Backend Build
# ==========================================
FROM node:22-alpine AS backend-build
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/

# Copy shared-types directory required by backend
COPY shared-types/ ./shared-types/
COPY *.tgz ./

# Full install (required for tsc to resolve workspace and dev dependencies)
RUN npm install --ignore-scripts

# Copy TypeScript configurations and source code
COPY tsconfig.json ./
COPY backend/ ./backend/
COPY backend/tsconfig.json ./backend/

# Run the build (Prisma generation + TypeScript compilation)
RUN npm run build --prefix backend

# Prune dev dependencies to keep only production modules in this stage
RUN npm prune --omit=dev

# ==========================================
# STAGE 3: Final Production Image (Nginx + Node)
# ==========================================
FROM node:22-alpine

# Install Nginx to serve the static frontend
RUN apk add --no-cache nginx

WORKDIR /app

# Copy production node_modules and compiled backend from the previous stage
COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/package.json ./backend/
COPY --from=backend-build /app/backend/prisma ./backend/prisma
COPY package.json ./

# Copy compiled static frontend files into Nginx public directory
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

EXPOSE 3000 80

# Launch the backend service pointing to the compiled distribution entry point
CMD ["node", "backend/dist/app.js"]