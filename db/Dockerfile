FROM python:3.11-slim

WORKDIR /app

# Install netcat-openbsd (alternative to netcat)
RUN apt-get update && apt-get install -y --no-install-recommends \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python script and data
COPY populate.py .
COPY data/ ./data/

# Copy the wait-for-postgres script
COPY wait-for-postgres.sh .
RUN chmod +x wait-for-postgres.sh

# Correct the CMD to invoke the script and Python
CMD ["./wait-for-postgres.sh", "db", "5432", "python", "populate.py"]
