#!/bin/bash

# BlackBox Rollback Script
# This script rolls back to a previous deployment

set -e

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.yml"
ROLLBACK_DIR="./backups"
MAX_BACKUPS=10

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

# Function to list available backups
list_backups() {
    log_info "Available backups:"
    if [ -d "$ROLLBACK_DIR" ]; then
        ls -la "$ROLLBACK_DIR" | grep "^d" | tail -n +2 | while read -r line; do
            echo "  $line"
        done
    else
        log_warning "No backups directory found."
    fi
}

# Function to perform rollback
rollback() {
    local backup_name="$1"

    if [ -z "$backup_name" ]; then
        log_error "Please specify a backup name to rollback to."
        log_info "Usage: $0 rollback <backup-name>"
        list_backups
        exit 1
    fi

    local backup_path="$ROLLBACK_DIR/$backup_name"

    if [ ! -d "$backup_path" ]; then
        log_error "Backup '$backup_name' not found in $ROLLBACK_DIR"
        list_backups
        exit 1
    fi

    log_warning "This will rollback to backup: $backup_name"
    read -p "Are you sure? (y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Rollback cancelled."
        exit 0
    fi

    log_info "Stopping current services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down

    log_info "Restoring data from backup..."

    if [ -d "$backup_path/postgres_data" ]; then
        log_info "Restoring PostgreSQL data..."
        rm -rf ./postgres_data
        cp -r "$backup_path/postgres_data" ./
    fi

    if [ -d "$backup_path/redis_data" ]; then
        log_info "Restoring Redis data..."
        rm -rf ./redis_data
        cp -r "$backup_path/redis_data" ./
    fi

    log_info "Starting services with restored data..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d

    log_success "Rollback completed successfully."
}

# Function to clean old backups
cleanup_backups() {
    if [ ! -d "$ROLLBACK_DIR" ]; then
        log_info "No backups directory found."
        return
    fi

    local backup_count=$(ls -1d "$ROLLBACK_DIR"/*/ 2>/dev/null | wc -l)

    if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
        log_info "Cleaning up old backups (keeping last $MAX_BACKUPS)..."

        # List backups by creation time, keep newest MAX_BACKUPS
        ls -1td "$ROLLBACK_DIR"/*/ | tail -n +$((MAX_BACKUPS + 1)) | while read -r old_backup; do
            log_info "Removing old backup: $(basename "$old_backup")"
            rm -rf "$old_backup"
        done

        log_success "Cleanup completed."
    else
        log_info "No cleanup needed. Current backups: $backup_count"
    fi
}

# Function to create emergency backup
emergency_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local emergency_backup="./backups/emergency_$timestamp"

    log_warning "Creating emergency backup before potential data loss..."

    mkdir -p "$emergency_backup"

    if [ -d "./postgres_data" ]; then
        cp -r ./postgres_data "$emergency_backup/"
    fi

    if [ -d "./redis_data" ]; then
        cp -r ./redis_data "$emergency_backup/"
    fi

    log_success "Emergency backup created: $emergency_backup"
}

# Function to show backup info
show_backup_info() {
    local backup_name="$1"

    if [ -z "$backup_name" ]; then
        log_error "Please specify a backup name."
        log_info "Usage: $0 info <backup-name>"
        exit 1
    fi

    local backup_path="$ROLLBACK_DIR/$backup_name"

    if [ ! -d "$backup_path" ]; then
        log_error "Backup '$backup_name' not found."
        exit 1
    fi

    log_info "Backup Information: $backup_name"
    echo "Location: $backup_path"
    echo "Created: $(stat -c %y "$backup_path" 2>/dev/null || stat -f %Sm -t "%Y-%m-%d %H:%M:%S" "$backup_path")"

    if [ -d "$backup_path/postgres_data" ]; then
        local pg_size=$(du -sh "$backup_path/postgres_data" 2>/dev/null | cut -f1)
        echo "PostgreSQL data size: $pg_size"
    fi

    if [ -d "$backup_path/redis_data" ]; then
        local redis_size=$(du -sh "$backup_path/redis_data" 2>/dev/null | cut -f1)
        echo "Redis data size: $redis_size"
    fi
}

# Main function
main() {
    case "${1:-}" in
        "list")
            list_backups
            ;;
        "rollback")
            rollback "$2"
            ;;
        "cleanup")
            cleanup_backups
            ;;
        "emergency")
            emergency_backup
            ;;
        "info")
            show_backup_info "$2"
            ;;
        *)
            echo "BlackBox Rollback Script"
            echo ""
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  list                    List all available backups"
            echo "  rollback <name>         Rollback to specified backup"
            echo "  cleanup                 Remove old backups (keep last $MAX_BACKUPS)"
            echo "  emergency               Create emergency backup"
            echo "  info <name>             Show information about a backup"
            echo ""
            echo "Examples:"
            echo "  $0 list"
            echo "  $0 rollback 20240901_143022"
            echo "  $0 cleanup"
            ;;
    esac
}
