# Multi-stage / optimized slim base with Python 3.11 and Node.js for SnarkJS
FROM python:3.11-slim

# Prevent Python from writing .pyc and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install curl, Node.js 20, and global snarkjs
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g snarkjs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set Node module resolution path so 'require("snarkjs")' works from any directory
ENV NODE_PATH=/usr/lib/node_modules:/usr/local/lib/node_modules

WORKDIR /app

# Install Python dependencies first for Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code, verification keys, and database init
COPY . .

# Expose application port
EXPOSE 10000 8000

# Launch Uvicorn server respecting Render's dynamic $PORT
CMD ["python", "-m", "app.main"]


