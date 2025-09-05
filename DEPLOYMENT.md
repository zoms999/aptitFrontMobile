# Deployment and Monitoring Guide

This document provides comprehensive instructions for deploying and monitoring the Aptit Mobile App in production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Deployment Methods](#deployment-methods)
5. [Monitoring and Analytics](#monitoring-and-analytics)
6. [Security Configuration](#security-configuration)
7. [Performance Optimization](#performance-optimization)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- Node.js 18.0.0 or higher
- PostgreSQL 12 or higher
- npm or yarn package manager
- Git for version control

### Optional Requirements

- Docker and Docker Compose (for containerized deployment)
- PM2 (for process management)
- Nginx (for reverse proxy)
- Redis (for caching and sessions)

## Environment Setup

### 1. Environment Variables

Copy the example environment file and configure your values:

```bash
cp .env.example .env.production
```

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/aptit_mobile?schema=public"

# Authentication
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-secret-key-minimum-32-characters"

# JWT Configuration
JWT_SECRET="your-jwt-secret-minimum-32-characters"
JWT_REFRESH_SECRET="your-jwt-refresh-secret-minimum-32-characters"

# Security
ALLOWED_ORIGINS="https://yourdomain.com"

# Monitoring (Optional)
SENTRY_DSN="your-sentry-dsn-here"
ENABLE_ANALYTICS="true"

# PWA Configuration
PWA_CACHE_VERSION="v1"
ENABLE_OFFLINE_MODE="true"
```

### 2. Security Configuration

Generate secure secrets:

```bash
# Generate secure random strings
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database Setup

### 1. Database Migration

Run the production migration script:

```bash
npm run migrate:production
```

Or manually:

```bash
npx prisma migrate deploy
npx prisma generate
```

### 2. Database Backup

The migration script automatically creates backups, but you can also create manual backups:

```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
```

## Deployment Methods

### Method 1: Traditional Deployment

#### 1. Build the Application

```bash
npm run build:production
```

#### 2. Deploy with Script

```bash
# Windows
npm run deploy

# Linux/Mac
./scripts/deploy.sh
```

#### 3. Manual Deployment Steps

```bash
# Install dependencies
npm ci --only=production

# Run migrations
npm run migrate:production

# Build application
npm run build

# Start application
npm start
```

### Method 2: Docker Deployment

#### 1. Build Docker Image

```bash
npm run docker:build
```

#### 2. Run with Docker Compose

```bash
npm run docker:run
```

#### 3. Manual Docker Commands

```bash
# Build image
docker build -t aptit-mobile-app .

# Run container
docker run -d \
  --name aptit-mobile-app \
  -p 3000:3000 \
  --env-file .env.production \
  aptit-mobile-app
```

### Method 3: Cloud Deployment

#### Vercel Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Configure environment variables in Vercel dashboard
3. Deploy: `vercel --prod`

#### AWS/Azure/GCP Deployment

1. Configure your cloud provider CLI
2. Set up database (RDS/Azure Database/Cloud SQL)
3. Deploy using your provider's container service
4. Configure load balancer and SSL certificate

## Monitoring and Analytics

### 1. Built-in Monitoring

The application includes comprehensive monitoring:

- **Error Tracking**: Automatic error reporting and logging
- **Performance Metrics**: Core Web Vitals and custom metrics
- **User Analytics**: Privacy-compliant user behavior tracking
- **PWA Metrics**: Installation and usage statistics

### 2. Analytics Dashboard

Access the analytics dashboard at `/admin/analytics` (requires admin privileges).

Features:
- Real-time performance metrics
- Error summaries and trends
- User engagement statistics
- PWA installation metrics

### 3. Health Checks

Health check endpoint: `/api/health`

Returns:
- Application status
- Database connectivity
- Memory usage
- System uptime

### 4. External Monitoring Integration

#### Sentry Integration

```env
SENTRY_DSN="your-sentry-dsn"
```

#### Custom Analytics

The monitoring system can be extended to integrate with:
- Google Analytics
- Mixpanel
- Amplitude
- Custom analytics solutions

## Security Configuration

### 1. HTTPS Configuration

Ensure HTTPS is enabled:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Security Headers

Security headers are automatically configured in `next.config.js`. Key headers include:

- Content Security Policy (CSP)
- Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options

### 3. Rate Limiting

Built-in rate limiting is configured for:
- Authentication endpoints: 5 requests per 15 minutes
- General API: 60 requests per minute
- Upload endpoints: 10 requests per 5 minutes

## Performance Optimization

### 1. Caching Strategy

The application implements multiple caching layers:

- **Service Worker**: Caches static assets and API responses
- **Next.js**: Built-in page and API caching
- **Database**: Query result caching
- **CDN**: Static asset delivery

### 2. Bundle Optimization

Automatic optimizations include:

- Code splitting by route and component
- Tree shaking for unused code
- Image optimization with Next.js Image component
- Compression and minification

### 3. Performance Monitoring

Monitor performance with:

```bash
# Bundle analysis
npm run build:analyze

# Performance testing
npm run test:e2e:mobile
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues

```bash
# Test database connection
npx prisma db pull --print

# Check database status
npm run deploy:health
```

#### 2. Build Failures

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

#### 3. Performance Issues

```bash
# Check memory usage
npm run deploy:health

# Analyze bundle size
npm run build:analyze
```

#### 4. PWA Installation Issues

- Ensure HTTPS is enabled
- Check manifest.json is accessible
- Verify service worker registration
- Check browser console for errors

### Logs and Debugging

#### Application Logs

```bash
# View application logs
npm run docker:logs

# Or with PM2
pm2 logs aptit-mobile-app
```

#### Performance Logs

Performance metrics are stored in the database and can be queried:

```sql
SELECT * FROM performance_metrics 
WHERE timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

#### Error Logs

```sql
SELECT * FROM error_logs 
WHERE timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

### Rollback Procedure

If deployment fails:

```bash
# Automatic rollback
npm run deploy:rollback

# Manual rollback
# 1. Stop current application
# 2. Restore from backup
# 3. Restart application
```

## Maintenance

### Regular Tasks

1. **Database Maintenance**
   - Weekly backups
   - Monthly cleanup of old logs
   - Performance optimization

2. **Security Updates**
   - Monthly dependency updates
   - Security patch reviews
   - SSL certificate renewal

3. **Performance Monitoring**
   - Weekly performance reviews
   - Monthly optimization analysis
   - Quarterly capacity planning

### Automated Tasks

The deployment scripts include automated:
- Database backups
- Log rotation
- Performance metric collection
- Health check monitoring

## Support

For deployment issues:

1. Check the deployment logs in `logs/deploy-*.log`
2. Review the health check endpoint `/api/health`
3. Check the analytics dashboard for system metrics
4. Contact the development team with specific error messages

## Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Prisma Production Guide](https://www.prisma.io/docs/guides/deployment)
- [PWA Best Practices](https://web.dev/pwa-checklist/)
- [Performance Optimization Guide](https://web.dev/performance/)