#building
FROM node:20-alpine AS builder
WORKDIR /frontend
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build  
RUN ls -la /frontend


#serving (runtime)
FROM nginx:alpine
COPY --from=builder /frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
