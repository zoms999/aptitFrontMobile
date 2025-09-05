#!/usr/bin/env node

/**
 * Production Build Script
 * Handles optimized build process for production deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BUILD_LOG = path.join(__dirname, '../logs/build.log');
const DIST_DIR = path.join(__dirname, '../.next');

// Ensure log directory exists
if (!fs.existsSync(path.dirname(BUILD_LOG))) {
  fs.mkdirSync(path.dirname(BUILD_LOG), { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(BUILD_LOG, logMessage);
}

function executeCommand(command, description) {
  try {
    log(`Starting: ${description}`);
    log(`Command: ${command}`);
    
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
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

function validateEnvironment() {
  log('Validating production environment...');
  
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    log(`Error: Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  log('Environment validation passed');
  return true;
}

function cleanPreviousBuild() {
  log('Cleaning previous build...');
  
  const dirsToClean = [
    '.next',
    'out',
    'dist',
    'node_modules/.cache'
  ];
  
  dirsToClean.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(fullPath)) {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        log(`Cleaned: ${dir}`);
      } catch (error) {
        log(`Warning: Could not clean ${dir}: ${error.message}`);
      }
    }
  });
  
  return true;
}

function installDependencies() {
  log('Installing production dependencies...');
  
  // Use npm ci for faster, reliable, reproducible builds
  return executeCommand('npm ci --only=production', 'Production dependency installation');
}

function generatePrismaClient() {
  log('Generating Prisma client...');
  return executeCommand('npx prisma generate', 'Prisma client generation');
}

function runTypeCheck() {
  log('Running TypeScript type check...');
  return executeCommand('npm run type-check', 'TypeScript type checking');
}

function runLinting() {
  log('Running ESLint...');
  return executeCommand('npm run lint', 'ESLint checking');
}

function buildApplication() {
  log('Building Next.js application...');
  
  // Set production environment
  process.env.NODE_ENV = 'production';
  
  return executeCommand('npm run build', 'Next.js application build');
}

function analyzeBuild() {
  if (process.env.ANALYZE_BUNDLE === 'true') {
    log('Analyzing bundle size...');
    return executeCommand('npm run build:analyze', 'Bundle analysis');
  } else {
    log('Skipping bundle analysis (ANALYZE_BUNDLE not enabled)');
    return true;
  }
}

function generateBuildReport() {
  log('Generating build report...');
  
  const buildInfo = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV,
    buildSuccess: true,
    buildSize: 0,
    buildTime: Date.now()
  };
  
  // Get build size
  try {
    const stats = fs.statSync(DIST_DIR);
    if (stats.isDirectory()) {
      const getDirectorySize = (dirPath) => {
        let totalSize = 0;
        const files = fs.readdirSync(dirPath);
        
        files.forEach(file => {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            totalSize += getDirectorySize(filePath);
          } else {
            totalSize += stats.size;
          }
        });
        
        return totalSize;
      };
      
      buildInfo.buildSize = getDirectorySize(DIST_DIR);
    }
  } catch (error) {
    log(`Warning: Could not calculate build size: ${error.message}`);
  }
  
  buildInfo.buildTime = Date.now() - buildInfo.buildTime;
  
  // Write build report
  const reportPath = path.join(__dirname, '../logs/build-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(buildInfo, null, 2));
  
  log(`Build report generated: ${reportPath}`);
  log(`Build size: ${(buildInfo.buildSize / 1024 / 1024).toFixed(2)} MB`);
  log(`Build time: ${(buildInfo.buildTime / 1000).toFixed(2)} seconds`);
  
  return true;
}

function validateBuild() {
  log('Validating build output...');
  
  const requiredFiles = [
    '.next/BUILD_ID',
    '.next/static',
    '.next/server'
  ];
  
  const missing = requiredFiles.filter(file => {
    const fullPath = path.join(__dirname, '..', file);
    return !fs.existsSync(fullPath);
  });
  
  if (missing.length > 0) {
    log(`Error: Missing build files: ${missing.join(', ')}`);
    return false;
  }
  
  log('Build validation passed');
  return true;
}

async function main() {
  log('=== Starting Production Build ===');
  log(`Node version: ${process.version}`);
  log(`Working directory: ${process.cwd()}`);
  
  const steps = [
    { name: 'Environment Validation', fn: validateEnvironment },
    { name: 'Clean Previous Build', fn: cleanPreviousBuild },
    { name: 'Install Dependencies', fn: installDependencies },
    { name: 'Generate Prisma Client', fn: generatePrismaClient },
    { name: 'TypeScript Check', fn: runTypeCheck },
    { name: 'ESLint Check', fn: runLinting },
    { name: 'Build Application', fn: buildApplication },
    { name: 'Analyze Build', fn: analyzeBuild },
    { name: 'Validate Build', fn: validateBuild },
    { name: 'Generate Report', fn: generateBuildReport }
  ];
  
  for (const step of steps) {
    log(`\n--- ${step.name} ---`);
    
    if (!step.fn()) {
      log(`Build failed at step: ${step.name}`);
      process.exit(1);
    }
  }
  
  log('\n=== Production Build Completed Successfully ===');
  log('Build artifacts are ready for deployment');
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

// Run build
main().catch((error) => {
  log(`Build script failed: ${error.message}`);
  process.exit(1);
});