#!/bin/bash

# Script to deploy to development environment

echo "Deploying to development environment..."

# Clean build files
rm -rf static/build
rm -rf static/node_modules/.cache

# Temporarily change to nodejs20.x for deployment
cp manifest.yml manifest.yml.bak
sed -i '' 's/name: nodejs[0-9]*\.x/name: nodejs20.x/g' manifest.yml

# Build
cd static
npm install
npm run build
cd ..

# Deploy to development
forge deploy --environment development

# Restore nodejs18.x in manifest
sed -i '' 's/name: nodejs[0-9]*\.x/name: nodejs18.x/g' manifest.yml

echo "Deployment to development complete!" 