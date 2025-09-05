#!/usr/bin/env node

/**
 * Final Integration Script
 * Performs comprehensive integration testing and optimization
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class FinalIntegrationManager {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.results = {
      tests: {},
      performance: {},
      security: {},
      deployment: {}
    };
  }

  async run() {
    console.log('🚀 Starting Final Integration Process...\n');

    try {
      await this.validateEnvironment();
      await this.runComprehensiveTests();
      await this.performSecurityAudit();
      await this.optimizePerformance();
      await this.validateDeploymentReadiness();
      await this.generateIntegrationReport();
      
      this.displayResults();
    } catch (error) {
      console.error('❌ Integration process failed:', error.message);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating Environment...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const requiredVersion = '18.0.0';
    
    if (!this.isVersionCompatible(nodeVersion.slice(1), requiredVersion)) {
      this.errors.push(`Node.js version ${nodeVersion} is not compatible. Required: ${requiredVersion}+`);
    }

    // Check required files
    const requiredFiles = [
      'package.json',
      'next.config.js',
      'prisma/schema.prisma',
      'public/manifest.json',
      'public/sw.js',
      '.env.example'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        this.errors.push(`Required file missing: ${file}`);
      }
    }

    // Check dependencies
    try {
      execSync('npm ls --depth=0', { stdio: 'pipe' });
      console.log('✅ Dependencies validated');
    } catch (error) {
      this.warnings.push('Some dependencies may have issues. Run npm audit for details.');
    }

    if (this.errors.length > 0) {
      throw new Error(`Environment validation failed: ${this.errors.join(', ')}`);
    }
  }

  async runComprehensiveTests() {
    console.log('🧪 Running Comprehensive Tests...');

    // Unit tests
    try {
      console.log('  Running unit tests...');
      const unitTestOutput = execSync('npm run test:ci', { encoding: 'utf8' });
      this.results.tests.unit = this.parseTestResults(unitTestOutput);
      console.log('✅ Unit tests passed');
    } catch (error) {
      this.errors.push('Unit tests failed');
      this.results.tests.unit = { passed: false, error: error.message };
    }

    // E2E tests
    try {
      console.log('  Running E2E tests...');
      const e2eOutput = execSync('npm run test:e2e', { encoding: 'utf8' });
      this.results.tests.e2e = this.parseTestResults(e2eOutput);
      console.log('✅ E2E tests passed');
    } catch (error) {
      this.warnings.push('Some E2E tests failed - check test output');
      this.results.tests.e2e = { passed: false, error: error.message };
    }

    // Integration tests
    try {
      console.log('  Running integration tests...');
      const integrationOutput = execSync('npx playwright test e2e/integration/', { encoding: 'utf8' });
      this.results.tests.integration = this.parseTestResults(integrationOutput);
      console.log('✅ Integration tests passed');
    } catch (error) {
      this.warnings.push('Integration tests had issues - review test results');
      this.results.tests.integration = { passed: false, error: error.message };
    }

    // Cross-device compatibility tests
    try {
      console.log('  Running cross-device compatibility tests...');
      const compatOutput = execSync('npx playwright test e2e/integration/cross-device-compatibility.spec.ts', { encoding: 'utf8' });
      this.results.tests.compatibility = this.parseTestResults(compatOutput);
      console.log('✅ Cross-device compatibility tests passed');
    } catch (error) {
      this.warnings.push('Cross-device compatibility tests had issues');
      this.results.tests.compatibility = { passed: false, error: error.message };
    }
  }

  async performSecurityAudit() {
    console.log('🔒 Performing Security Audit...');

    // NPM audit
    try {
      console.log('  Running npm audit...');
      const auditOutput = execSync('npm audit --audit-level moderate --json', { encoding: 'utf8' });
      const auditData = JSON.parse(auditOutput);
      this.results.security.npm = {
        vulnerabilities: auditData.metadata?.vulnerabilities || {},
        passed: Object.keys(auditData.metadata?.vulnerabilities || {}).length === 0
      };
      console.log('✅ NPM audit completed');
    } catch (error) {
      this.warnings.push('NPM audit found vulnerabilities - review and fix');
      this.results.security.npm = { passed: false, error: error.message };
    }

    // Security headers check
    try {
      console.log('  Checking security headers...');
      const securityCheck = this.validateSecurityHeaders();
      this.results.security.headers = securityCheck;
      if (securityCheck.passed) {
        console.log('✅ Security headers validated');
      } else {
        this.warnings.push('Security headers need attention');
      }
    } catch (error) {
      this.warnings.push('Security headers validation failed');
      this.results.security.headers = { passed: false, error: error.message };
    }

    // Environment variables check
    try {
      console.log('  Validating environment variables...');
      const envCheck = this.validateEnvironmentVariables();
      this.results.security.environment = envCheck;
      if (envCheck.passed) {
        console.log('✅ Environment variables validated');
      } else {
        this.warnings.push('Environment variables need attention');
      }
    } catch (error) {
      this.warnings.push('Environment variables validation failed');
      this.results.security.environment = { passed: false, error: error.message };
    }
  }

  async optimizePerformance() {
    console.log('⚡ Optimizing Performance...');

    // Build optimization
    try {
      console.log('  Running production build...');
      execSync('npm run build', { stdio: 'pipe' });
      console.log('✅ Production build successful');
      
      // Analyze bundle size
      const bundleAnalysis = this.analyzeBundleSize();
      this.results.performance.bundle = bundleAnalysis;
      
      if (bundleAnalysis.totalSize > 1024 * 1024) { // 1MB
        this.warnings.push('Bundle size is large - consider optimization');
      }
    } catch (error) {
      this.errors.push('Production build failed');
      this.results.performance.bundle = { passed: false, error: error.message };
    }

    // Lighthouse audit
    try {
      console.log('  Running Lighthouse audit...');
      const lighthouseOutput = execSync('npm run lighthouse:ci', { encoding: 'utf8' });
      this.results.performance.lighthouse = this.parseLighthouseResults(lighthouseOutput);
      console.log('✅ Lighthouse audit completed');
    } catch (error) {
      this.warnings.push('Lighthouse audit had issues - check performance metrics');
      this.results.performance.lighthouse = { passed: false, error: error.message };
    }

    // Performance optimization check
    const performanceCheck = this.validatePerformanceOptimizations();
    this.results.performance.optimizations = performanceCheck;
  }

  async validateDeploymentReadiness() {
    console.log('🚢 Validating Deployment Readiness...');

    // Check deployment configuration
    const deploymentChecks = [
      this.checkDockerConfiguration(),
      this.checkEnvironmentConfiguration(),
      this.checkDatabaseMigrations(),
      this.checkSSLConfiguration(),
      this.checkMonitoringSetup()
    ];

    this.results.deployment = {
      docker: deploymentChecks[0],
      environment: deploymentChecks[1],
      database: deploymentChecks[2],
      ssl: deploymentChecks[3],
      monitoring: deploymentChecks[4]
    };

    const allPassed = deploymentChecks.every(check => check.passed);
    
    if (allPassed) {
      console.log('✅ Deployment readiness validated');
    } else {
      this.warnings.push('Some deployment checks failed - review configuration');
    }
  }

  async generateIntegrationReport() {
    console.log('📊 Generating Integration Report...');

    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      results: this.results,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalTests: this.getTotalTestCount(),
        passedTests: this.getPassedTestCount(),
        criticalIssues: this.errors.length,
        warnings: this.warnings.length
      }
    };

    // Write report to file
    const reportPath = path.join(__dirname, '..', 'integration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    this.generateHTMLReport(report);

    console.log(`✅ Integration report generated: ${reportPath}`);
  }

  displayResults() {
    console.log('\n📋 Integration Results Summary');
    console.log('================================');

    // Test results
    console.log('\n🧪 Test Results:');
    Object.entries(this.results.tests).forEach(([type, result]) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`  ${status} ${type}: ${result.passed ? 'PASSED' : 'FAILED'}`);
    });

    // Security results
    console.log('\n🔒 Security Audit:');
    Object.entries(this.results.security).forEach(([type, result]) => {
      const status = result.passed ? '✅' : '⚠️';
      console.log(`  ${status} ${type}: ${result.passed ? 'PASSED' : 'NEEDS ATTENTION'}`);
    });

    // Performance results
    console.log('\n⚡ Performance:');
    Object.entries(this.results.performance).forEach(([type, result]) => {
      const status = result.passed ? '✅' : '⚠️';
      console.log(`  ${status} ${type}: ${result.passed ? 'OPTIMIZED' : 'NEEDS OPTIMIZATION'}`);
    });

    // Deployment readiness
    console.log('\n🚢 Deployment Readiness:');
    Object.entries(this.results.deployment).forEach(([type, result]) => {
      const status = result.passed ? '✅' : '⚠️';
      console.log(`  ${status} ${type}: ${result.passed ? 'READY' : 'NEEDS CONFIGURATION'}`);
    });

    // Summary
    console.log('\n📊 Summary:');
    console.log(`  Total Tests: ${this.getTotalTestCount()}`);
    console.log(`  Passed Tests: ${this.getPassedTestCount()}`);
    console.log(`  Critical Issues: ${this.errors.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);

    if (this.errors.length === 0) {
      console.log('\n🎉 Integration completed successfully!');
      console.log('The application is ready for deployment.');
    } else {
      console.log('\n❌ Integration completed with errors.');
      console.log('Please address the following issues before deployment:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings to address:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
  }

  // Helper methods
  isVersionCompatible(current, required) {
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (currentParts[i] > requiredParts[i]) return true;
      if (currentParts[i] < requiredParts[i]) return false;
    }
    return true;
  }

  parseTestResults(output) {
    // Basic test result parsing - can be enhanced based on test framework output
    const passed = !output.includes('FAIL') && !output.includes('failed');
    const testCount = (output.match(/\d+ (test|spec)s?/g) || []).length;
    
    return {
      passed,
      testCount,
      output: output.slice(0, 500) // Truncate for report
    };
  }

  validateSecurityHeaders() {
    // Check if security headers are configured in next.config.js
    const nextConfigPath = path.join(__dirname, '..', 'next.config.js');
    
    if (!fs.existsSync(nextConfigPath)) {
      return { passed: false, error: 'next.config.js not found' };
    }

    const configContent = fs.readFileSync(nextConfigPath, 'utf8');
    const hasSecurityHeaders = configContent.includes('X-Frame-Options') &&
                              configContent.includes('X-Content-Type-Options') &&
                              configContent.includes('X-XSS-Protection');

    return {
      passed: hasSecurityHeaders,
      details: hasSecurityHeaders ? 'Security headers configured' : 'Security headers missing'
    };
  }

  validateEnvironmentVariables() {
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'NEXTAUTH_SECRET'
    ];

    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    
    return {
      passed: missing.length === 0,
      missing,
      details: missing.length === 0 ? 'All required variables present' : `Missing: ${missing.join(', ')}`
    };
  }

  analyzeBundleSize() {
    const buildDir = path.join(__dirname, '..', '.next');
    
    if (!fs.existsSync(buildDir)) {
      return { passed: false, error: 'Build directory not found' };
    }

    // Estimate bundle size (simplified)
    const staticDir = path.join(buildDir, 'static');
    let totalSize = 0;

    if (fs.existsSync(staticDir)) {
      const calculateSize = (dir) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            calculateSize(filePath);
          } else {
            totalSize += stat.size;
          }
        });
      };

      calculateSize(staticDir);
    }

    return {
      passed: totalSize < 2 * 1024 * 1024, // 2MB threshold
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
    };
  }

  parseLighthouseResults(output) {
    // Basic Lighthouse result parsing
    const scores = {
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
      pwa: 0
    };

    // Extract scores from output (simplified)
    const performanceMatch = output.match(/Performance: (\d+)/);
    if (performanceMatch) scores.performance = parseInt(performanceMatch[1]);

    const passed = scores.performance >= 90;

    return {
      passed,
      scores,
      details: `Performance score: ${scores.performance}`
    };
  }

  validatePerformanceOptimizations() {
    const optimizations = [
      this.checkImageOptimization(),
      this.checkCodeSplitting(),
      this.checkCaching(),
      this.checkCompression()
    ];

    const allOptimized = optimizations.every(opt => opt.enabled);

    return {
      passed: allOptimized,
      optimizations,
      details: allOptimized ? 'All optimizations enabled' : 'Some optimizations missing'
    };
  }

  checkImageOptimization() {
    const nextConfigPath = path.join(__dirname, '..', 'next.config.js');
    const configContent = fs.readFileSync(nextConfigPath, 'utf8');
    return {
      name: 'Image Optimization',
      enabled: configContent.includes('images') || configContent.includes('Image')
    };
  }

  checkCodeSplitting() {
    // Check if dynamic imports are used
    const srcDir = path.join(__dirname, '..', 'src');
    let hasDynamicImports = false;

    const checkDirectory = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          checkDirectory(filePath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes('dynamic(') || content.includes('import(')) {
            hasDynamicImports = true;
          }
        }
      });
    };

    checkDirectory(srcDir);

    return {
      name: 'Code Splitting',
      enabled: hasDynamicImports
    };
  }

  checkCaching() {
    const swPath = path.join(__dirname, '..', 'public', 'sw.js');
    return {
      name: 'Service Worker Caching',
      enabled: fs.existsSync(swPath)
    };
  }

  checkCompression() {
    const nextConfigPath = path.join(__dirname, '..', 'next.config.js');
    const configContent = fs.readFileSync(nextConfigPath, 'utf8');
    return {
      name: 'Compression',
      enabled: configContent.includes('compress') || configContent.includes('gzip')
    };
  }

  checkDockerConfiguration() {
    const dockerfilePath = path.join(__dirname, '..', 'Dockerfile');
    const dockerComposePath = path.join(__dirname, '..', 'docker-compose.yml');
    
    return {
      passed: fs.existsSync(dockerfilePath) && fs.existsSync(dockerComposePath),
      details: 'Docker configuration files present'
    };
  }

  checkEnvironmentConfiguration() {
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    return {
      passed: fs.existsSync(envExamplePath),
      details: 'Environment configuration template available'
    };
  }

  checkDatabaseMigrations() {
    const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
    return {
      passed: fs.existsSync(migrationsDir),
      details: 'Database migrations directory exists'
    };
  }

  checkSSLConfiguration() {
    const nextConfigPath = path.join(__dirname, '..', 'next.config.js');
    const configContent = fs.readFileSync(nextConfigPath, 'utf8');
    
    return {
      passed: configContent.includes('https') || configContent.includes('ssl'),
      details: 'SSL configuration present in Next.js config'
    };
  }

  checkMonitoringSetup() {
    const monitoringFiles = [
      path.join(__dirname, '..', 'src', 'lib', 'monitoring.ts'),
      path.join(__dirname, '..', 'src', 'components', 'monitoring')
    ];

    const hasMonitoring = monitoringFiles.some(file => fs.existsSync(file));
    
    return {
      passed: hasMonitoring,
      details: hasMonitoring ? 'Monitoring components present' : 'Monitoring setup missing'
    };
  }

  getTotalTestCount() {
    return Object.values(this.results.tests).reduce((total, result) => {
      return total + (result.testCount || 0);
    }, 0);
  }

  getPassedTestCount() {
    return Object.values(this.results.tests).filter(result => result.passed).length;
  }

  generateHTMLReport(report) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aptit Mobile - Integration Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .section { margin: 20px 0; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        .result-item { padding: 10px; margin: 5px 0; border-left: 4px solid #ddd; }
        .result-item.passed { border-left-color: #28a745; }
        .result-item.failed { border-left-color: #dc3545; }
        .result-item.warning { border-left-color: #ffc107; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Aptit Mobile - Integration Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Environment: Node.js ${report.environment.nodeVersion} on ${report.environment.platform}</p>
    </div>

    <div class="section">
        <h2>Summary</h2>
        <p>Total Tests: ${report.summary.totalTests}</p>
        <p>Passed Tests: ${report.summary.passedTests}</p>
        <p class="error">Critical Issues: ${report.summary.criticalIssues}</p>
        <p class="warning">Warnings: ${report.summary.warnings}</p>
    </div>

    <div class="section">
        <h2>Test Results</h2>
        ${Object.entries(report.results.tests).map(([type, result]) => `
            <div class="result-item ${result.passed ? 'passed' : 'failed'}">
                <strong>${type}:</strong> ${result.passed ? 'PASSED' : 'FAILED'}
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>Security Audit</h2>
        ${Object.entries(report.results.security).map(([type, result]) => `
            <div class="result-item ${result.passed ? 'passed' : 'warning'}">
                <strong>${type}:</strong> ${result.passed ? 'PASSED' : 'NEEDS ATTENTION'}
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>Performance</h2>
        ${Object.entries(report.results.performance).map(([type, result]) => `
            <div class="result-item ${result.passed ? 'passed' : 'warning'}">
                <strong>${type}:</strong> ${result.passed ? 'OPTIMIZED' : 'NEEDS OPTIMIZATION'}
            </div>
        `).join('')}
    </div>

    ${report.errors.length > 0 ? `
    <div class="section">
        <h2 class="error">Critical Issues</h2>
        ${report.errors.map(error => `<p class="error">• ${error}</p>`).join('')}
    </div>
    ` : ''}

    ${report.warnings.length > 0 ? `
    <div class="section">
        <h2 class="warning">Warnings</h2>
        ${report.warnings.map(warning => `<p class="warning">• ${warning}</p>`).join('')}
    </div>
    ` : ''}
</body>
</html>
    `;

    const htmlReportPath = path.join(__dirname, '..', 'integration-report.html');
    fs.writeFileSync(htmlReportPath, htmlContent);
  }
}

// Run the integration process
if (require.main === module) {
  const integrationManager = new FinalIntegrationManager();
  integrationManager.run().catch(error => {
    console.error('Integration process failed:', error);
    process.exit(1);
  });
}

module.exports = FinalIntegrationManager;