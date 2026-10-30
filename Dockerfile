# Multi-Stage Production Dockerfile for FaceSense AI
# Builds React Frontend + Python FastAPI Backend into a single unified service

# --- STAGE 1: Frontend Build ---
FROM node:20-alpine AS frontend-builder
WORKDIR /build

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# --- STAGE 2: Python Backend Runtime ---
FROM python:3.12-slim

# Install system libraries required by OpenCV & MediaPipe
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy compiled frontend from Stage 1 into /app/frontend/dist
COPY --from=frontend-builder /build/dist ./frontend/dist

# Ensure model and storage directories exist
RUN mkdir -p /app/backend/models /app/backend/storage/snapshots

WORKDIR /app/backend

# Set environment variables
ENV PYTHONPATH=/app/backend
ENV PORT=8000

EXPOSE 8000

# Start Uvicorn bound to 0.0.0.0 and dynamic PORT
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
