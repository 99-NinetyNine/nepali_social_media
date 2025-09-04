#!/bin/bash

echo "🚀 Social Media Platform Demo Setup"
echo "=================================="
echo

# Quick setup and run
echo "Step 1: Setting up the project..."
./run.sh setup --create-superuser

echo
echo "Step 2: Starting development servers..."
echo "This will open:"
echo "  - Backend API: http://localhost:8000"
echo "  - Frontend App: http://localhost:3000" 
echo "  - Admin Panel: http://localhost:8000/admin"
echo

./run.sh dev