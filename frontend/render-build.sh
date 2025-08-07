#!/bin/bash
echo "Starting Render build process..."
npm install
npm run build
echo "Build completed. Starting server..."
node server.js