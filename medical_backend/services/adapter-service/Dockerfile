FROM node:18-alpine
WORKDIR /app

# Copy package.json
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port and start the application
EXPOSE 3002 
CMD ["node", "index.js"]