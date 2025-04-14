# Use the official Nginx image from the Docker Hub
FROM nginx:alpine

# Copy all the HTML files and other static assets (like CSS, JS, etc.) into the Nginx's default directory
COPY . /usr/share/nginx/html

# Replace the default nginx.conf with a custom one to set graph.html as the default page
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80 to access the application from the host
EXPOSE 80

# Start Nginx when the container is run
CMD ["nginx", "-g", "daemon off;"]
