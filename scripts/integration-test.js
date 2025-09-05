#!/usr/bin/env node

/**
 * Simplified Integration Test Script
 * Tests core functionality without running full test suite
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class IntegrationTester {
  constructor() {
    this.results = {
      build: false,
      dependencies: false,
      configuration: false,
      deployment: false
    };
    this.errors = [];
    this.warnings = [];
  }

  async run() {
    console.log('🚀 Starting Integration Testing...\n');

    try {
      await this.checkDependencies();
      await this.validateConfiguration();
      await this.testBuild();
      await this.checkDeploymentReadiness();
      
      this.displayResults();
    } catch (error) {
      console.error('❌ Integration testing failed:', error.message);
      process.exit(1);
    }
  }

  async checkDependencies() {
    console.log('📦 Checking Dependencies...');
    
    try {
      // Check if package.json exists
      if (!fs.existsSync('package.json')) {
        throw new Error('package.json not found');
      }

      // Check if node_modules exists
      if (!fs.existsSync('node_modules')) {
        console.log('  Installing dependencies...');
        execSync('npm install', { stdio: 'inherit' });
      }

      // Basic dependency check
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const requiredDeps = ['next', 'react', 'react-dom', '@prisma/client'];
      
      for (const dep of requiredDeps) {
        if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
          this.warnings.push(`Missing dependency: ${dep}`);
        }
      }

      this.results.dependencies = true;
      console.log('✅ Dependencies validated');
    } catch (error) {
      this.errors.push(`Dependency check failed: ${error.message}`);
      this.results.dependencies = false;
    }
  }

  async validateConfiguration() {
    console.log('⚙️  Validating Configuration...');
    
    try {
      const requiredFiles = [
        'next.config.js',
        'tailwind.config.js',
        'tsconfig.json',
        'prisma/schema.prisma',
        'public/manifest.json',
        'public/sw.js'
      ];

      const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
      
      if (missingFiles.length > 0) {
        this.warnings.push(`Missing configuration files: ${missingFiles.join(', ')}`);
      }

      // Check environment variables
      const envExample = fs.existsSync('.env.example');
      if (!envExample) {
        this.warnings.push('Missing .env.example file');
      }

      this.results.configuration = true;
      console.log('✅ Configuration validated');
    } catch (error) {
      this.errors.push(`Configuration validation failed: ${error.message}`);
      this.results.configuration = false;
    }
  }

  async testBuild() {
    console.log('🔨 Testing Build Process...');
    
    try {
      // Test TypeScript compilation
      console.log('  Checking TypeScript...');
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      
      // Test Next.js build
      console.log('  Building application...');
      execSync('npm run build', { stdio: 'pipe' });
      
      // Check if build output exists
      if (!fs.existsSync('.next')) {
        throw new Error('Build output not found');
      }

      this.results.build = true;
      console.log('✅ Build successful');
    } catch (error) {
      this.errors.push(`Build failed: ${error.message}`);
      this.results.build = false;
    }
  }

  async checkDeploymentReadiness() {
    console.log('🚢 Checking Deployment Readiness...');
    
    try {
      const deploymentChecks = [
        this.checkDockerFiles(),
        this.checkSecurityConfiguration(),
        this.checkPWAConfiguration(),
        this.checkDatabaseConfiguration()
      ];

      const results = await Promise.all(deploymentChecks);
      const allPassed = results.every(result => result.passed);

      if (!allPassed) {
        const failedChecks = results
          .filter(result => !result.passed)
          .map(result => result.name);
        this.warnings.push(`Deployment checks failed: ${failedChecks.join(', ')}`);
      }

      this.results.deployment = allPassed;
      console.log(allPassed ? '✅ Deployment ready' : '⚠️  Deployment needs attention');
    } catch (error) {
      this.errors.push(`Deployment check failed: ${error.message}`);
      this.results.deployment = false;
    }
  }

  checkDockerFiles() {
    const dockerfileExists = fs.existsSync('Dockerfile');
    const dockerComposeExists = fs.existsSync('docker-compose.yml');
    
    return {
      name: 'Docker Configuration',
      passed: dockerfileExists && dockerComposeExists,
      details: `Dockerfile: ${dockerfileExists}, docker-compose.yml: ${dockerComposeExists}`
    };
  }

  checkSecurityConfiguration() {
    try {
      const nextConfig = fs.readFileSync('next.config.js', 'utf8');
      const hasSecurityHeaders = nextConfig.includes('X-Frame-Options') ||
                                nextConfig.includes('Content-Security-Policy');
      
      return {
        name: 'Security Configuration',
        passed: hasSecurityHeaders,
        details: hasSecurityHeaders ? 'Security headers configured' : 'Security headers missing'
      };
    } catch (error) {
      return {
        name: 'Security Configuration',
        passed: false,
        details: 'Could not read next.config.js'
      };
    }
  }

  checkPWAConfiguration() {
    const manifestExists = fs.existsSync('public/manifest.json');
    const swExists = fs.existsSync('public/sw.js');
    
    return {
      name: 'PWA Configuration',
      passed: manifestExists && swExists,
      details: `Manifest: ${manifestExists}, Service Worker: ${swExists}`
    };
  }

  checkDatabaseConfiguration() {
    const schemaExists = fs.existsSync('prisma/schema.prisma');
    const migrationsExist = fs.existsSync('prisma/migrations');
    
    return {
      name: 'Database Configuration',
      passed: schemaExists,
      details: `Schema: ${schemaExists}, Migrations: ${migrationsExist}`
    };
  }

  displayResults() {
    console.log('\n📋 Integration Test Results');
    console.log('============================');

    // Display results
    Object.entries(this.results).forEach(([test, passed]) => {
      const status = passed ? '✅' : '❌';
      const testName = test.charAt(0).toUpperCase() + test.slice(1);
      console.log(`${status} ${testName}: ${passed ? 'PASSED' : 'FAILED'}`);
    });

    // Display summary
    const totalTests = Object.keys(this.results).length;
    const passedTests = Object.values(this.results).filter(Boolean).length;
    
    console.log('\n📊 Summary:');
    console.log(`  Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`  Critical Issues: ${this.errors.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);

    // Display errors and warnings
    if (this.errors.length > 0) {
      console.log('\n❌ Critical Issues:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    // Final status
    const allPassed = Object.values(this.results).every(Boolean);
    
    if (allPassed && this.errors.length === 0) {
      console.log('\n🎉 Integration testing completed successfully!');
      console.log('The application is ready for deployment.');
    } else if (this.errors.length === 0) {
      console.log('\n⚠️  Integration testing completed with warnings.');
      console.log('The application can be deployed but should address warnings.');
    } else {
      console.log('\n❌ Integration testing failed.');
      console.log('Please address critical issues before deployment.');
      process.exit(1);
    }

    // Generate simple report
    this.generateReport();
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalTests: Object.keys(this.results).length,
        passedTests: Object.values(this.results).filter(Boolean).length,
        criticalIssues: this.errors.length,
        warnings: this.warnings.length
      }
    };

    const reportPath = 'integration-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }
}

// Run the integration test
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.run().catch(error => {
    console.error('Integration test failed:', error);
    process.exit(1);
  });
}

module.exports = IntegrationTester;