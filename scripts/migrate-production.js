#!/usr/bin/env node

/**
 * Production Database Migration Script
 * Handles database migrations for production deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BACKUP_DIR = path.join(__dirname, '../backups');
const MIGRATION_LOG = path.join(__dirname, '../logs/migration.log');

// Ensure directories exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

if (!fs.existsSync(path.dirname(MIGRATION_LOG))) {
  fs.mkdirSync(path.dirname(MIGRATION_LOG), { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(MIGRATION_LOG, logMessage);
}

function executeCommand(command, description) {
  try {
    log(`Starting: ${description}`);
    log(`Command: ${command}`);
    
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    log(`Success: ${description}`);
    if (output) {
      log(`Output: ${output}`);
    }
    return true;
  } catch (error) {
    log(`Error: ${description} failed`);
    log(`Error message: ${error.message}`);
    if (error.stdout) {
      log(`Stdout: ${error.stdout}`);
    }
    if (error.stderr) {
      log(`Stderr: ${error.stderr}`);
    }
    return false;
  }
}

function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);
  
  log('Creating database backup before migration...');
  
  // Extract database info from DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    log('Error: DATABASE_URL not found in environment variables');
    return false;
  }
  
  try {
    const url = new URL(dbUrl);
    const backupCommand = `pg_dump "${dbUrl}" > "${backupFile}"`;
    
    if (executeCommand(backupCommand, 'Database backup')) {
      log(`Backup created successfully: ${backupFile}`);
      return backupFile;
    }
  } catch (error) {
    log(`Backup failed: ${error.message}`);
  }
  
  return false;
}

function runMigrations() {
  log('Running Prisma migrations...');
  
  // Generate Prisma client
  if (!executeCommand('npx prisma generate', 'Prisma client generation')) {
    return false;
  }
  
  // Deploy migrations
  if (!executeCommand('npx prisma migrate deploy', 'Prisma migration deployment')) {
    return false;
  }
  
  // Verify database status
  if (!executeCommand('npx prisma migrate status', 'Migration status check')) {
    return false;
  }
  
  return true;
}

function seedDatabase() {
  const seedFile = path.join(__dirname, '../prisma/seed.js');
  
  if (fs.existsSync(seedFile)) {
    log('Running database seed...');
    return executeCommand('npx prisma db seed', 'Database seeding');
  } else {
    log('No seed file found, skipping seeding');
    return true;
  }
}

function validateMigration() {
  log('Validating migration...');
  
  // Check database connection
  if (!executeCommand('npx prisma db pull --print', 'Database connection test')) {
    return false;
  }
  
  // Validate schema
  if (!executeCommand('npx prisma validate', 'Schema validation')) {
    return false;
  }
  
  return true;
}

async function main() {
  log('=== Starting Production Database Migration ===');
  log(`Environment: ${process.env.NODE_ENV || 'unknown'}`);
  log(`Database URL: ${process.env.DATABASE_URL ? '[CONFIGURED]' : '[MISSING]'}`);
  
  // Check if we're in production
  if (process.env.NODE_ENV !== 'production') {
    log('Warning: Not running in production environment');
  }
  
  // Create backup
  const backupFile = createBackup();
  if (!backupFile) {
    log('Migration aborted: Backup failed');
    process.exit(1);
  }
  
  // Run migrations
  if (!runMigrations()) {
    log('Migration failed: Rolling back...');
    log(`Restore from backup: psql "${process.env.DATABASE_URL}" < "${backupFile}"`);
    process.exit(1);
  }
  
  // Seed database if needed
  if (!seedDatabase()) {
    log('Warning: Database seeding failed, but migration completed');
  }
  
  // Validate migration
  if (!validateMigration()) {
    log('Warning: Migration validation failed');
  }
  
  log('=== Migration Completed Successfully ===');
  log(`Backup available at: ${backupFile}`);
}

// Handle errors
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Run migration
main().catch((error) => {
  log(`Migration script failed: ${error.message}`);
  process.exit(1);
});