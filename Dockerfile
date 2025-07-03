# Use an official Node.js runtime as the base image
FROM node:18

# Create a non-root user and set permissions
RUN groupadd -r app && useradd -r -g app -m app

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Change the ownership of the application code to the app user
RUN chown -R app:app /app

# Set the user to the app user
USER app

# Specify the command to run your application
#ENTRYPOINT ["tail", "-f", "/dev/null"]
CMD ["npm", "start"]
