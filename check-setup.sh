#!/bin/bash

echo "🔍 Checking Social Media Platform Setup"
echo "======================================"

# Check Python
echo -n "Python 3: "
if command -v python3 &> /dev/null; then
    python3 --version
else
    echo "❌ Not installed"
fi

# Check Node.js
echo -n "Node.js: "
if command -v node &> /dev/null; then
    node --version
else
    echo "❌ Not installed"
fi

# Check npm
echo -n "npm: "
if command -v npm &> /dev/null; then
    npm --version
else
    echo "❌ Not installed"
fi

echo ""
echo "📁 Directory Structure:"
echo "Backend files:"
ls -la manage.py 2>/dev/null && echo "✅ manage.py found" || echo "❌ manage.py missing"
ls -la requirements.txt 2>/dev/null && echo "✅ requirements.txt found" || echo "❌ requirements.txt missing"

echo ""
echo "Frontend files:"
ls -la frontend/package.json 2>/dev/null && echo "✅ frontend/package.json found" || echo "❌ frontend/package.json missing"
ls -la frontend/src/App.tsx 2>/dev/null && echo "✅ frontend/src/App.tsx found" || echo "❌ frontend/src/App.tsx missing"

echo ""
echo "🔧 Configuration files:"
ls -la .gitignore 2>/dev/null && echo "✅ .gitignore found" || echo "❌ .gitignore missing"
ls -la run.sh 2>/dev/null && echo "✅ run.sh found" || echo "❌ run.sh missing"

echo ""
echo "📦 Python virtual environment:"
if [ -d "venv" ]; then
    echo "✅ venv directory exists"
else
    echo "❌ venv directory missing - run './run.sh setup' first"
fi

echo ""
echo "📦 Node modules:"
if [ -d "frontend/node_modules" ]; then
    echo "✅ frontend/node_modules exists"
else
    echo "❌ frontend/node_modules missing - run 'cd frontend && npm install'"
fi

echo ""
echo "🚀 Ready to run? Execute:"
echo "  ./run.sh setup    # First time setup"
echo "  ./run.sh dev      # Start development servers"