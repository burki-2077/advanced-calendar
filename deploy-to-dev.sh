#!/bin/bash

# Script to deploy to development environment

echo "Deploying to development environment..."

# Clean build files
rm -rf static/build
rm -rf static/node_modules/.cache

# Build
cd static
npm install
npm run build
cd ..

# Deploy to development
forge deploy --environment development

echo "Deployment to development complete!" 