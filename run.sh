#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Python dependencies
setup_backend() {
    print_status "Setting up Django backend..."
    
    # Check if Python is installed
    if ! command_exists python3; then
        print_error "Python 3 is not installed. Please install Python 3.9+ and try again."
        exit 1
    fi
    
    # Check Python version
    python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    print_status "Python version: $python_version"
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        print_status "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    print_status "Activating virtual environment..."
    source venv/bin/activate
    
    # Upgrade pip
    print_status "Upgrading pip..."
    pip install --upgrade pip
    
    # Install Python dependencies
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_status "Creating .env file..."
        cp .env.example .env
        print_warning "Please edit .env file with your configuration"
    fi
    
    # Run database migrations
    print_status "Running database migrations..."
    python manage.py makemigrations
    python manage.py migrate
    
    # Create superuser if requested
    if [ "$1" = "--create-superuser" ] || [ "$1" = "-su" ]; then
        print_status "Creating superuser..."
        python manage.py createsuperuser
    fi
    
    # Collect static files
    print_status "Collecting static files..."
    python manage.py collectstatic --noinput
    
    print_success "Backend setup completed!"
}

# Function to install Node.js dependencies
setup_frontend() {
    print_status "Setting up React frontend..."
    
    # Check if Node.js is installed
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 16+ and try again."
        exit 1
    fi
    
    # Check Node.js version
    node_version=$(node --version)
    print_status "Node.js version: $node_version"
    
    # Navigate to frontend directory
    cd frontend
    
    # Check if npm is installed
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    # Install dependencies
    print_status "Installing Node.js dependencies..."
    npm install
    
    # Create .env.local if it doesn't exist
    if [ ! -f ".env.local" ]; then
        print_status "Creating .env.local file..."
        echo "REACT_APP_API_URL=http://localhost:8000/api" > .env.local
    fi
    
    # Go back to root directory
    cd ..
    
    print_success "Frontend setup completed!"
}

# Function to run development servers
run_dev() {
    print_status "Starting development servers..."
    
    # Start backend in background
    print_status "Starting Django development server..."
    source venv/bin/activate
    python manage.py runserver 8000 &
    BACKEND_PID=$!
    
    # Wait a moment for backend to start
    sleep 3
    
    # Start frontend
    print_status "Starting React development server..."
    cd frontend
    npm start &
    FRONTEND_PID=$!
    
    # Wait for user input to stop servers
    print_success "Development servers are running!"
    print_status "Backend: http://localhost:8000"
    print_status "Frontend: http://localhost:3000"
    print_status "Admin: http://localhost:8000/admin"
    print_warning "Press Ctrl+C to stop both servers"
    
    # Function to cleanup background processes
    cleanup() {
        print_status "Stopping servers..."
        kill $BACKEND_PID 2>/dev/null
        kill $FRONTEND_PID 2>/dev/null
        exit 0
    }
    
    # Trap Ctrl+C
    trap cleanup SIGINT
    
    # Wait for processes
    wait
}

# Function to run backend only
run_backend() {
    print_status "Starting Django backend only..."
    source venv/bin/activate
    python manage.py runserver 8000
}

# Function to run frontend only
run_frontend() {
    print_status "Starting React frontend only..."
    cd frontend
    npm start
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    # Backend tests
    print_status "Running Django tests..."
    source venv/bin/activate
    python manage.py test
    
    # Frontend tests
    print_status "Running React tests..."
    cd frontend
    npm test -- --watchAll=false
    cd ..
}

# Function to build for production
build_prod() {
    print_status "Building for production..."
    
    # Build frontend
    print_status "Building React frontend..."
    cd frontend
    npm run build
    cd ..
    
    # Collect static files
    print_status "Collecting static files..."
    source venv/bin/activate
    python manage.py collectstatic --noinput
    
    print_success "Production build completed!"
    print_status "Frontend build: frontend/build/"
    print_status "Static files: staticfiles/"
}

# Function to reset database
reset_db() {
    print_warning "This will delete all data in the database!"
    read -p "Are you sure? (y/N): " confirm
    
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        print_status "Resetting database..."
        rm -f db.sqlite3
        source venv/bin/activate
        python manage.py makemigrations
        python manage.py migrate
        print_success "Database reset completed!"
        
        read -p "Create a new superuser? (y/N): " create_su
        if [[ $create_su == [yY] || $create_su == [yY][eE][sS] ]]; then
            python manage.py createsuperuser
        fi
    else
        print_status "Database reset cancelled."
    fi
}

# Function to show help
show_help() {
    echo "Social Media Platform - Setup and Run Script"
    echo ""
    echo "Usage: ./run.sh [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  setup              Set up both backend and frontend"
    echo "  setup-backend      Set up Django backend only"
    echo "  setup-frontend     Set up React frontend only"
    echo "  dev                Run both development servers"
    echo "  backend            Run Django backend only"
    echo "  frontend           Run React frontend only"
    echo "  test               Run all tests"
    echo "  build              Build for production"
    echo "  reset-db           Reset the database"
    echo "  help               Show this help message"
    echo ""
    echo "Options:"
    echo "  --create-superuser, -su    Create superuser during backend setup"
    echo ""
    echo "Examples:"
    echo "  ./run.sh setup             # Set up everything"
    echo "  ./run.sh setup --create-superuser  # Setup and create superuser"
    echo "  ./run.sh dev               # Run development servers"
    echo "  ./run.sh backend           # Run backend only"
    echo "  ./run.sh build             # Build for production"
}

# Main script logic
main() {
    case "$1" in
        "setup")
            setup_backend "$2"
            setup_frontend
            ;;
        "setup-backend")
            setup_backend "$2"
            ;;
        "setup-frontend")
            setup_frontend
            ;;
        "dev")
            run_dev
            ;;
        "backend")
            run_backend
            ;;
        "frontend")
            run_frontend
            ;;
        "test")
            run_tests
            ;;
        "build")
            build_prod
            ;;
        "reset-db")
            reset_db
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        "")
            print_warning "No command specified. Use './run.sh help' for usage information."
            echo ""
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Check if we're in the right directory
if [ ! -f "manage.py" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the project root directory."
    exit 1
fi

# Run main function with all arguments
main "$@"