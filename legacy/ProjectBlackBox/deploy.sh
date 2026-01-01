#!/bin/bash

# BlackBox Production Deployment Script
# This script deploys the BlackBox system to a production server

set -e

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is installed and running
check_docker() {
    log_info "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker service."
        exit 1
    fi

    log_success "Docker and Docker Compose are properly installed and running."
}

# Function to check environment variables
check_environment() {
    log_info "Checking environment configuration..."

    if [ ! -f "$ENV_FILE" ]; then
        log_warning "Environment file $ENV_FILE not found. Creating from template..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_warning "Please edit .env file with your production values before proceeding."
            exit 1
        else
            log_error "Neither .env nor .env.example found. Please create environment configuration."
            exit 1
        fi
    fi

    # Check for required environment variables
    required_vars=("POSTGRES_PASSWORD" "JWT_SECRET" "OPENAI_API_KEY" "ELEVENLABS_API_KEY")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env || grep -q "^${var}=.*changeme" .env; then
            log_error "Required environment variable $var is not set or has default value. Please update .env file."
            exit 1
        fi
    done

    log_success "Environment configuration looks good."
}

# Function to create backup
create_backup() {
    if [ -d "./postgres_data" ] || [ -d "./redis_data" ]; then
        log_info "Creating backup of existing data..."
        mkdir -p "$BACKUP_DIR"

        if [ -d "./postgres_data" ]; then
            cp -r ./postgres_data "$BACKUP_DIR/"
        fi

        if [ -d "./redis_data" ]; then
            cp -r ./redis_data "$BACKUP_DIR/"
        fi

        log_success "Backup created at $BACKUP_DIR"
    else
        log_info "No existing data to backup."
    fi
}

# Function to stop existing containers
stop_services() {
    log_info "Stopping existing services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down || true
    log_success "Existing services stopped."
}

# Function to build and start services
start_services() {
    log_info "Building and starting services..."

    # Build images
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache

    # Start services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d

    log_success "Services started successfully."
}

# Function to wait for services to be healthy
wait_for_services() {
    log_info "Waiting for services to become healthy..."

    local services=("postgres" "server" "dashboard")
    local max_attempts=30
    local attempt=1

    for service in "${services[@]}"; do
        log_info "Waiting for $service to be healthy..."
        while [ $attempt -le $max_attempts ]; do
            if docker-compose -f "$DOCKER_COMPOSE_FILE" ps "$service" | grep -q "healthy"; then
                log_success "$service is healthy."
                break
            fi

            log_info "Attempt $attempt/$max_attempts: $service is not yet healthy..."
            sleep 10
            ((attempt++))
        done

        if [ $attempt -gt $max_attempts ]; then
            log_error "$service failed to become healthy within the timeout period."
            show_logs "$service"
            exit 1
        fi
    done

    log_success "All services are healthy!"
}

# Function to show logs for troubleshooting
show_logs() {
    local service="$1"
    log_info "Showing logs for $service:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs "$service"
}

# Function to run database migrations
run_migrations() {
    log_info "Running database migrations..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T server npm run migrate
    log_success "Database migrations completed."
}

# Function to verify deployment
verify_deployment() {
    log_info "Verifying deployment..."

    # Test health endpoint
    if curl -f -s http://localhost/health > /dev/null; then
        log_success "Health check passed."
    else
        log_error "Health check failed."
        exit 1
    fi

    # Test API endpoint
    if curl -f -s http://localhost/api/health > /dev/null; then
        log_success "API health check passed."
    else
        log_error "API health check failed."
        exit 1
    fi

    log_success "Deployment verification completed successfully."
}

# Function to show deployment status
show_status() {
    log_info "Deployment Status:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps

    log_info "Service URLs:"
    echo "Dashboard: http://localhost"
    echo "API: http://localhost/api"
    echo "Health Check: http://localhost/health"
    echo "WebSocket: ws://localhost/socket.io"
}

# Main deployment function
main() {
    echo "========================================="
    echo "   BlackBox Production Deployment"
    echo "========================================="

    check_docker
    check_environment
    create_backup
    stop_services
    start_services
    wait_for_services
    run_migrations
    verify_deployment
    show_status

    echo ""
    log_success "🎉 BlackBox deployment completed successfully!"
    echo ""
    log_info "Useful commands:"
    echo "  • View logs: docker-compose logs -f"
    echo "  • Stop services: docker-compose down"
    echo "  • Restart service: docker-compose restart <service-name>"
    echo "  • Update services: docker-compose pull && docker-compose up -d"
}

# Handle command line arguments
case "${1:-}" in
    "stop")
        log_info "Stopping all services..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down
        log_success "Services stopped."
        ;;
    "restart")
        log_info "Restarting all services..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" restart
        log_success "Services restarted."
        ;;
    "logs")
        log_info "Showing service logs..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f
        ;;
    "status")
        show_status
        ;;
    "backup")
        create_backup
        ;;
    *)
        main
        ;;
esac
