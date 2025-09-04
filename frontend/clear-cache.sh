#!/bin/bash

echo "🧹 Clearing React/TypeScript caches..."

# Remove TypeScript build cache
rm -rf .tsbuildinfo

# Remove React Scripts cache
rm -rf node_modules/.cache

# Remove Jest cache
rm -rf node_modules/.cache/jest

# Remove ESLint cache
rm -f .eslintcache

# Remove any other cache directories
rm -rf build/
rm -rf dist/

echo "✅ Cache cleared successfully!"
echo "Now restart your development server with: npm start"