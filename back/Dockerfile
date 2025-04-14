# Use the official Python image as the base
FROM python:3.9-slim

# Install system dependencies for PostgreSQL and other packages
RUN apt-get update \
    && apt-get install -y libpq-dev build-essential \
    && apt-get clean

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code into the container
COPY . .

# Expose the port that FastAPI will run on
EXPOSE 8000

# Run the FastAPI app with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
