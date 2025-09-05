#!/bin/bash

# Production Deployment Script for Aptit Mobile App
# This script handles the complete deployment process

set -e  # Exit on any error

# Configuration
APP_NAME="aptit-mobile-app"
BUILD_DIR=".next"
BACKUP_DIR="backups"
LOG_DIR="logs"
DEPLOY_LOG="$LOG_DIR/deploy-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$DEPLOY_LOG"
}

# Create necessary directories
create_directories() {
    log "INFO" "Creating necessary directories..."
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKUP_DIR"
    log "SUCCESS" "Directories created"
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js is not installed"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2)
    local required_version="18.0.0"
    
    if ! node -e "process.exit(require('semver').gte('$node_version', '$required_version') ? 0 : 1)" 2>/dev/null; then
        log "ERROR" "Node.js version $node_version is below required version $required_version"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log "ERROR" "npm is not installed"
        exit 1
    fi
    
    # Check PostgreSQL client (for migrations)
    if ! command -v psql &> /dev/null; then
        log "WARN" "PostgreSQL client not found - database operations may fail"
    fi
    
    # Check environment variables
    if [ -z "$DATABASE_URL" ]; then
        log "ERROR" "DATABASE_URL environment variable is not set"
        exit 1
    fi
    
    if [ -z "$NEXTAUTH_SECRET" ]; then
        log "ERROR" "NEXTAUTH_SECRET environment variable is not set"
        exit 1
    fi
    
    log "SUCCESS" "Prerequisites check passed"
}

# Backup current deployment
backup_current_deployment() {
    log "INFO" "Creating backup of current deployment..."
    
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    if [ -d "$BUILD_DIR" ]; then
        cp -r "$BUILD_DIR" "$backup_path"
        log "SUCCESS" "Backup created at $backup_path"
        echo "$backup_path" > "$BACKUP_DIR/latest-backup.txt"
    else
        log "INFO" "No existing build to backup"
    fi
}

# Run database migrations
run_migrations() {
    log "INFO" "Running database migrations..."
    
    if node scripts/migrate-production.js; then
        log "SUCCESS" "Database migrations completed"
    else
        log "ERROR" "Database migrations failed"
        exit 1
    fi
}

# Build application
build_application() {
    log "INFO" "Building application for production..."
    
    if node scripts/build-production.js; then
        log "SUCCESS" "Application build completed"
    else
        log "ERROR" "Application build failed"
        exit 1
    fi
}

# Validate deployment
validate_deployment() {
    log "INFO" "Validating deployment..."
    
    # Check if build directory exists
    if [ ! -d "$BUILD_DIR" ]; then
        log "ERROR" "Build directory not found"
        exit 1
    fi
    
    # Check critical files
    local critical_files=(
        "$BUILD_DIR/BUILD_ID"
        "$BUILD_DIR/static"
        "$BUILD_DIR/server"
        "public/manifest.json"
        "public/sw.js"
    )
    
    for file in "${critical_files[@]}"; do
        if [ ! -e "$file" ]; then
            log "ERROR" "Critical file missing: $file"
            exit 1
        fi
    done
    
    # Test database connection
    if ! npx prisma db pull --print > /dev/null 2>&1; then
        log "ERROR" "Database connection test failed"
        exit 1
    fi
    
    log "SUCCESS" "Deployment validation passed"
}

# Start application (for PM2 or similar process managers)
start_application() {
    log "INFO" "Starting application..."
    
    # Stop existing process if running
    if command -v pm2 &> /dev/null; then
        pm2 stop "$APP_NAME" 2>/dev/null || true
        pm2 delete "$APP_NAME" 2>/dev/null || true
        
        # Start with PM2
        pm2 start npm --name "$APP_NAME" -- start
        pm2 save
        
        log "SUCCESS" "Application started with PM2"
    else
        log "INFO" "PM2 not found, starting with npm..."
        npm start &
        echo $! > "$LOG_DIR/app.pid"
        log "SUCCESS" "Application started (PID: $(cat $LOG_DIR/app.pid))"
    fi
}

# Health check
health_check() {
    log "INFO" "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    local health_url="http://localhost:3000/api/health"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            log "SUCCESS" "Health check passed"
            return 0
        fi
        
        log "INFO" "Health check attempt $attempt/$max_attempts failed, retrying in 5 seconds..."
        sleep 5
        ((attempt++))
    done
    
    log "ERROR" "Health check failed after $max_attempts attempts"
    exit 1
}

# Rollback function
rollback() {
    log "WARN" "Rolling back deployment..."
    
    if [ -f "$BACKUP_DIR/latest-backup.txt" ]; then
        local backup_path=$(cat "$BACKUP_DIR/latest-backup.txt")
        
        if [ -d "$backup_path" ]; then
            rm -rf "$BUILD_DIR"
            cp -r "$backup_path" "$BUILD_DIR"
            
            # Restart application
            if command -v pm2 &> /dev/null; then
                pm2 restart "$APP_NAME"
            else
                if [ -f "$LOG_DIR/app.pid" ]; then
                    kill $(cat "$LOG_DIR/app.pid") 2>/dev/null || true
                fi
                npm start &
                echo $! > "$LOG_DIR/app.pid"
            fi
            
            log "SUCCESS" "Rollback completed"
        else
            log "ERROR" "Backup not found for rollback"
        fi
    else
        log "ERROR" "No backup available for rollback"
    fi
}

# Cleanup old backups and logs
cleanup() {
    log "INFO" "Cleaning up old files..."
    
    # Keep only last 5 backups
    find "$BACKUP_DIR" -name "backup-*" -type d | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true
    
    # Keep only last 10 log files
    find "$LOG_DIR" -name "deploy-*.log" -type f | sort -r | tail -n +11 | xargs rm -f 2>/dev/null || true
    
    log "SUCCESS" "Cleanup completed"
}

# Main deployment function
main() {
    log "INFO" "Starting deployment of $APP_NAME"
    log "INFO" "Deployment log: $DEPLOY_LOG"
    
    # Trap errors for rollback
    trap 'log "ERROR" "Deployment failed, initiating rollback..."; rollback; exit 1' ERR
    
    create_directories
    check_prerequisites
    backup_current_deployment
    run_migrations
    build_application
    validate_deployment
    start_application
    health_check
    cleanup
    
    log "SUCCESS" "Deployment completed successfully!"
    log "INFO" "Application is running and healthy"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "health")
        health_check
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health|cleanup}"
        echo "  deploy   - Full deployment process (default)"
        echo "  rollback - Rollback to previous version"
        echo "  health   - Perform health check"
        echo "  cleanup  - Clean old backups and logs"
        exit 1
        ;;
esac