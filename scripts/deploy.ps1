# Production Deployment Script for Aptit Mobile App (PowerShell)
# This script handles the complete deployment process on Windows

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("deploy", "rollback", "health", "cleanup")]
    [string]$Action = "deploy"
)

# Configuration
$APP_NAME = "aptit-mobile-app"
$BUILD_DIR = ".next"
$BACKUP_DIR = "backups"
$LOG_DIR = "logs"
$DEPLOY_LOG = "$LOG_DIR/deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# Ensure log directory exists
if (!(Test-Path $LOG_DIR)) {
    New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
}

# Logging function
function Write-Log {
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet("INFO", "WARN", "ERROR", "SUCCESS")]
        [string]$Level,
        
        [Parameter(Mandatory=$true)]
        [string]$Message
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    switch ($Level) {
        "INFO"    { Write-Host "[$Level] $Message" -ForegroundColor Blue }
        "WARN"    { Write-Host "[$Level] $Message" -ForegroundColor Yellow }
        "ERROR"   { Write-Host "[$Level] $Message" -ForegroundColor Red }
        "SUCCESS" { Write-Host "[$Level] $Message" -ForegroundColor Green }
    }
    
    Add-Content -Path $DEPLOY_LOG -Value $logMessage
}

# Create necessary directories
function New-Directories {
    Write-Log "INFO" "Creating necessary directories..."
    
    @($LOG_DIR, $BACKUP_DIR) | ForEach-Object {
        if (!(Test-Path $_)) {
            New-Item -ItemType Directory -Path $_ -Force | Out-Null
        }
    }
    
    Write-Log "SUCCESS" "Directories created"
}

# Check prerequisites
function Test-Prerequisites {
    Write-Log "INFO" "Checking prerequisites..."
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        if (!$nodeVersion) {
            throw "Node.js not found"
        }
        
        $version = $nodeVersion.TrimStart('v')
        $requiredVersion = [Version]"18.0.0"
        $currentVersion = [Version]$version
        
        if ($currentVersion -lt $requiredVersion) {
            throw "Node.js version $version is below required version 18.0.0"
        }
        
        Write-Log "INFO" "Node.js version: $nodeVersion"
    }
    catch {
        Write-Log "ERROR" "Node.js check failed: $($_.Exception.Message)"
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-Log "INFO" "npm version: $npmVersion"
    }
    catch {
        Write-Log "ERROR" "npm is not installed"
        exit 1
    }
    
    # Check environment variables
    $requiredVars = @("DATABASE_URL", "NEXTAUTH_SECRET", "JWT_SECRET", "JWT_REFRESH_SECRET")
    
    foreach ($var in $requiredVars) {
        if (!(Get-ChildItem Env: | Where-Object Name -eq $var)) {
            Write-Log "ERROR" "Environment variable $var is not set"
            exit 1
        }
    }
    
    Write-Log "SUCCESS" "Prerequisites check passed"
}

# Backup current deployment
function Backup-CurrentDeployment {
    Write-Log "INFO" "Creating backup of current deployment..."
    
    $backupName = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    $backupPath = Join-Path $BACKUP_DIR $backupName
    
    if (Test-Path $BUILD_DIR) {
        Copy-Item -Path $BUILD_DIR -Destination $backupPath -Recurse -Force
        Write-Log "SUCCESS" "Backup created at $backupPath"
        Set-Content -Path "$BACKUP_DIR/latest-backup.txt" -Value $backupPath
    }
    else {
        Write-Log "INFO" "No existing build to backup"
    }
}

# Run database migrations
function Invoke-Migrations {
    Write-Log "INFO" "Running database migrations..."
    
    try {
        node scripts/migrate-production.js
        Write-Log "SUCCESS" "Database migrations completed"
    }
    catch {
        Write-Log "ERROR" "Database migrations failed: $($_.Exception.Message)"
        exit 1
    }
}

# Build application
function Build-Application {
    Write-Log "INFO" "Building application for production..."
    
    try {
        node scripts/build-production.js
        Write-Log "SUCCESS" "Application build completed"
    }
    catch {
        Write-Log "ERROR" "Application build failed: $($_.Exception.Message)"
        exit 1
    }
}

# Validate deployment
function Test-Deployment {
    Write-Log "INFO" "Validating deployment..."
    
    # Check if build directory exists
    if (!(Test-Path $BUILD_DIR)) {
        Write-Log "ERROR" "Build directory not found"
        exit 1
    }
    
    # Check critical files
    $criticalFiles = @(
        "$BUILD_DIR/BUILD_ID",
        "$BUILD_DIR/static",
        "$BUILD_DIR/server",
        "public/manifest.json",
        "public/sw.js"
    )
    
    foreach ($file in $criticalFiles) {
        if (!(Test-Path $file)) {
            Write-Log "ERROR" "Critical file missing: $file"
            exit 1
        }
    }
    
    # Test database connection
    try {
        npx prisma db pull --print | Out-Null
        Write-Log "SUCCESS" "Database connection test passed"
    }
    catch {
        Write-Log "ERROR" "Database connection test failed"
        exit 1
    }
    
    Write-Log "SUCCESS" "Deployment validation passed"
}

# Start application
function Start-Application {
    Write-Log "INFO" "Starting application..."
    
    # Check if PM2 is available
    try {
        pm2 --version | Out-Null
        
        # Stop existing process
        pm2 stop $APP_NAME 2>$null
        pm2 delete $APP_NAME 2>$null
        
        # Start with PM2
        pm2 start npm --name $APP_NAME -- start
        pm2 save
        
        Write-Log "SUCCESS" "Application started with PM2"
    }
    catch {
        Write-Log "INFO" "PM2 not found, starting with npm..."
        
        # Kill existing process if running
        $pidFile = "$LOG_DIR/app.pid"
        if (Test-Path $pidFile) {
            $pid = Get-Content $pidFile
            try {
                Stop-Process -Id $pid -Force
            }
            catch {
                # Process might already be stopped
            }
        }
        
        # Start new process
        $process = Start-Process -FilePath "npm" -ArgumentList "start" -PassThru -WindowStyle Hidden
        Set-Content -Path $pidFile -Value $process.Id
        
        Write-Log "SUCCESS" "Application started (PID: $($process.Id))"
    }
}

# Health check
function Test-Health {
    Write-Log "INFO" "Performing health check..."
    
    $maxAttempts = 30
    $attempt = 1
    $healthUrl = "http://localhost:3000/api/health"
    
    while ($attempt -le $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Log "SUCCESS" "Health check passed"
                return
            }
        }
        catch {
            # Continue to retry
        }
        
        Write-Log "INFO" "Health check attempt $attempt/$maxAttempts failed, retrying in 5 seconds..."
        Start-Sleep -Seconds 5
        $attempt++
    }
    
    Write-Log "ERROR" "Health check failed after $maxAttempts attempts"
    exit 1
}

# Rollback function
function Invoke-Rollback {
    Write-Log "WARN" "Rolling back deployment..."
    
    $latestBackupFile = "$BACKUP_DIR/latest-backup.txt"
    
    if (Test-Path $latestBackupFile) {
        $backupPath = Get-Content $latestBackupFile
        
        if (Test-Path $backupPath) {
            if (Test-Path $BUILD_DIR) {
                Remove-Item -Path $BUILD_DIR -Recurse -Force
            }
            Copy-Item -Path $backupPath -Destination $BUILD_DIR -Recurse -Force
            
            # Restart application
            try {
                pm2 restart $APP_NAME
            }
            catch {
                $pidFile = "$LOG_DIR/app.pid"
                if (Test-Path $pidFile) {
                    $pid = Get-Content $pidFile
                    try {
                        Stop-Process -Id $pid -Force
                    }
                    catch {
                        # Process might already be stopped
                    }
                }
                
                $process = Start-Process -FilePath "npm" -ArgumentList "start" -PassThru -WindowStyle Hidden
                Set-Content -Path $pidFile -Value $process.Id
            }
            
            Write-Log "SUCCESS" "Rollback completed"
        }
        else {
            Write-Log "ERROR" "Backup not found for rollback"
        }
    }
    else {
        Write-Log "ERROR" "No backup available for rollback"
    }
}

# Cleanup old backups and logs
function Invoke-Cleanup {
    Write-Log "INFO" "Cleaning up old files..."
    
    # Keep only last 5 backups
    Get-ChildItem -Path $BACKUP_DIR -Directory -Name "backup-*" | 
        Sort-Object -Descending | 
        Select-Object -Skip 5 | 
        ForEach-Object { Remove-Item -Path "$BACKUP_DIR/$_" -Recurse -Force }
    
    # Keep only last 10 log files
    Get-ChildItem -Path $LOG_DIR -File -Name "deploy-*.log" | 
        Sort-Object -Descending | 
        Select-Object -Skip 10 | 
        ForEach-Object { Remove-Item -Path "$LOG_DIR/$_" -Force }
    
    Write-Log "SUCCESS" "Cleanup completed"
}

# Main deployment function
function Invoke-Deploy {
    Write-Log "INFO" "Starting deployment of $APP_NAME"
    Write-Log "INFO" "Deployment log: $DEPLOY_LOG"
    
    try {
        New-Directories
        Test-Prerequisites
        Backup-CurrentDeployment
        Invoke-Migrations
        Build-Application
        Test-Deployment
        Start-Application
        Test-Health
        Invoke-Cleanup
        
        Write-Log "SUCCESS" "Deployment completed successfully!"
        Write-Log "INFO" "Application is running and healthy"
    }
    catch {
        Write-Log "ERROR" "Deployment failed: $($_.Exception.Message)"
        Write-Log "WARN" "Initiating rollback..."
        Invoke-Rollback
        exit 1
    }
}

# Main script execution
switch ($Action) {
    "deploy"   { Invoke-Deploy }
    "rollback" { Invoke-Rollback }
    "health"   { Test-Health }
    "cleanup"  { Invoke-Cleanup }
    default    { 
        Write-Host "Usage: .\deploy.ps1 [-Action {deploy|rollback|health|cleanup}]"
        Write-Host "  deploy   - Full deployment process (default)"
        Write-Host "  rollback - Rollback to previous version"
        Write-Host "  health   - Perform health check"
        Write-Host "  cleanup  - Clean old backups and logs"
        exit 1
    }
}