# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Expose a port if your application listens on a specific port
# EXPOSE 3000

# Specify the command to run your application
 ENTRYPOINT ["tail", "-f", "/dev/null"]
#CMD ["npm", "start"]
