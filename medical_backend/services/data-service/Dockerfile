FROM node:18-alpine
WORKDIR /app

# explicit copy of package.json
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest
COPY . .

# (Remember to change the EXPOSE port for each service: 3000, 3001, 3002, 3003)
EXPOSE 3001 
CMD ["node", "index.js"]