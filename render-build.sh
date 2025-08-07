#!/bin/bash
# Script de build pour Render

echo "🚀 Starting Render deployment..."

# Frontend build
echo "📦 Building frontend..."
cd frontend
npm ci
npm run build

echo "✅ Frontend build completed!"
echo "📁 Build output in frontend/dist/"