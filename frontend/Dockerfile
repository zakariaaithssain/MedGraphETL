#building
FROM node:20-alpine AS builder
WORKDIR /frontend
# Accept build-time argument
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package*.json .
RUN npm install
COPY . .
RUN npm run build  

#serving (runtime)
FROM nginx:alpine
COPY --from=builder /frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
