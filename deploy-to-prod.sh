#!/bin/bash

# Script to deploy to production environment

echo "Deploying to production environment..."

# Clean build files
rm -rf static/build
rm -rf static/node_modules/.cache

# Build
cd static
npm install
npm run build
cd ..

# Deploy to production
forge deploy --environment production

echo "Deployment to production complete!" 