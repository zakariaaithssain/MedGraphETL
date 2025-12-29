#building
FROM node:20-alpine AS builder
WORKDIR /frontend
COPY package*.json .
RUN npm install
COPY . .
ENV VITE_API_BASE_URL=http://backend:8000
RUN npm run build  

#serving (runtime)
FROM nginx:alpine
COPY --from=builder /frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
