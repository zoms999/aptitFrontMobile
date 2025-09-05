# Aptit Mobile App - Deployment Guide

## Overview

This guide covers the complete deployment process for the Aptit Mobile PWA, including production build, environment setup, monitoring, and maintenance procedures.

## Prerequisites

### System Requirements
- Node.js 18.0.0 or higher
- PostgreSQL 13 or higher
- Docker (optional, for containerized deployment)
- SSL certificate for HTTPS (required for PWA)

### Environment Setup
- Production server with HTTPS support
- Database server (PostgreSQL)
- CDN for static assets (recommended)
- Monitoring and analytics services

## Environment Configuration

### 1. Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/aptit_mobile_prod"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret-key-here"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret-key-here"
NEXTAUTH_SECRET="your-nextauth-secret-key-here"
NEXTAUTH_URL="https://yourdomain.com"

# App Configuration
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXT_PUBLIC_API_URL="https://yourdomain.com/api"

# PWA Configuration
NEXT_PUBLIC_PWA_NAME="Aptit Mobile"
NEXT_PUBLIC_PWA_SHORT_NAME="Aptit"
NEXT_PUBLIC_PWA_DESCRIPTION="Mobile aptitude testing application"

# Analytics and Monitoring
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
SENTRY_AUTH_TOKEN="your-sentry-auth-token"

# Security
CSRF_SECRET="your-csrf-secret-key"
ENCRYPTION_KEY="your-32-character-encryption-key"

# External Services
SMTP_HOST="smtp.yourmailprovider.com"
SMTP_PORT="587"
SMTP_USER="your-smtp-username"
SMTP_PASS="your-smtp-password"

# Performance
REDIS_URL="redis://localhost:6379" # Optional, for caching
CDN_URL="https://cdn.yourdomain.com" # Optional, for static assets
```

### 2. Database Setup

#### Production Database Migration

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed initial data (if needed)
npx prisma db seed
```

#### Database Backup Strategy

```bash
# Create backup script
#!/bin/bash
BACKUP_DIR="/backups/aptit-mobile"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/aptit_mobile_$DATE.sql"

mkdir -p $BACKUP_DIR
pg_dump $DATABASE_URL > $BACKUP_FILE
gzip $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

## Build Process

### 1. Production Build

```bash
# Install production dependencies
npm ci --only=production

# Build the application
npm run build:production

# Verify build
npm run start
```

### 2. Build Optimization

The build process includes:
- Code splitting and tree shaking
- Image optimization
- CSS minification
- Service worker generation
- Bundle analysis
- Security headers configuration

### 3. Build Verification

```bash
# Run production build tests
npm run test:ci

# Run end-to-end tests
npm run test:e2e

# Performance audit
npm run lighthouse:ci

# Security audit
npm audit --audit-level moderate
```

## Deployment Methods

### Method 1: Direct Server Deployment

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash aptit
sudo usermod -aG sudo aptit
```

#### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-org/aptit-mobile.git
cd aptit-mobile/mobileApp

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 3. Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; manifest-src 'self';" always;

    # PWA specific headers
    add_header Service-Worker-Allowed "/" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Service worker
    location /sw.js {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Manifest
    location /manifest.json {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=86400";
    }
}
```

### Method 2: Docker Deployment

#### 1. Docker Compose Setup

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: aptit_mobile_prod
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### 2. Deploy with Docker

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale application
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

### Method 3: Cloud Platform Deployment

#### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
```

#### AWS/Azure/GCP Deployment

Refer to platform-specific documentation for:
- Container services (ECS, Container Instances, Cloud Run)
- Serverless functions (Lambda, Functions, Cloud Functions)
- Static hosting with CDN (CloudFront, CDN, Cloud CDN)

## Monitoring and Maintenance

### 1. Health Checks

```bash
# Application health endpoint
curl -f https://yourdomain.com/api/health

# Database connectivity
curl -f https://yourdomain.com/api/health/db

# Service worker status
curl -f https://yourdomain.com/sw.js
```

### 2. Performance Monitoring

#### Lighthouse CI Configuration

```json
{
  "ci": {
    "collect": {
      "url": ["https://yourdomain.com"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["error", {"minScore": 0.9}],
        "categories:seo": ["error", {"minScore": 0.9}],
        "categories:pwa": ["error", {"minScore": 0.9}]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

#### Core Web Vitals Monitoring

```javascript
// Add to your analytics
function reportWebVitals(metric) {
  gtag('event', metric.name, {
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    event_category: 'Web Vitals',
    event_label: metric.id,
    non_interaction: true,
  });
}
```

### 3. Error Monitoring

#### Sentry Configuration

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    // Filter out non-critical errors
    if (event.exception) {
      const error = event.exception.values?.[0];
      if (error?.type === 'ChunkLoadError') {
        return null; // Ignore chunk load errors
      }
    }
    return event;
  }
});
```

### 4. Backup and Recovery

#### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

set -e

BACKUP_DIR="/backups/aptit-mobile"
DATE=$(date +%Y%m%d_%H%M%S)
APP_NAME="aptit-mobile"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
echo "Creating database backup..."
pg_dump $DATABASE_URL > "$BACKUP_DIR/db_$DATE.sql"
gzip "$BACKUP_DIR/db_$DATE.sql"

# Application files backup
echo "Creating application backup..."
tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  /path/to/aptit-mobile

# Upload to cloud storage (optional)
if [ ! -z "$AWS_S3_BUCKET" ]; then
  aws s3 cp "$BACKUP_DIR/db_$DATE.sql.gz" "s3://$AWS_S3_BUCKET/backups/"
  aws s3 cp "$BACKUP_DIR/app_$DATE.tar.gz" "s3://$AWS_S3_BUCKET/backups/"
fi

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed successfully"
```

#### Recovery Procedure

```bash
# Database recovery
gunzip -c /backups/aptit-mobile/db_YYYYMMDD_HHMMSS.sql.gz | psql $DATABASE_URL

# Application recovery
tar -xzf /backups/aptit-mobile/app_YYYYMMDD_HHMMSS.tar.gz -C /

# Restart services
pm2 restart all
# or
docker-compose restart
```

## Security Considerations

### 1. SSL/TLS Configuration

- Use TLS 1.2 or higher
- Implement HSTS headers
- Use strong cipher suites
- Regular certificate renewal

### 2. Security Headers

```javascript
// next.config.js security headers
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];
```

### 3. Regular Security Updates

```bash
# Weekly security audit
npm audit --audit-level moderate

# Update dependencies
npm update

# Check for vulnerabilities
npm audit fix
```

## Troubleshooting

### Common Issues

#### 1. Service Worker Not Updating

```bash
# Clear service worker cache
# In browser console:
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister();
  }
});
```

#### 2. Database Connection Issues

```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
# Monitor active connections in PostgreSQL
SELECT count(*) FROM pg_stat_activity;
```

#### 3. Memory Issues

```bash
# Monitor memory usage
free -h
top -p $(pgrep node)

# PM2 memory monitoring
pm2 monit

# Docker memory usage
docker stats
```

#### 4. Performance Issues

```bash
# Check application logs
pm2 logs aptit-mobile

# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com/

# Database query performance
# Enable slow query log in PostgreSQL
```

## Rollback Procedures

### 1. Application Rollback

```bash
# PM2 rollback
pm2 reload ecosystem.config.js --env production

# Docker rollback
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --scale app=1

# Git-based rollback
git checkout previous-stable-tag
npm run build
pm2 restart all
```

### 2. Database Rollback

```bash
# Restore from backup
gunzip -c /backups/aptit-mobile/db_YYYYMMDD_HHMMSS.sql.gz | psql $DATABASE_URL

# Prisma migration rollback
npx prisma migrate reset --force
npx prisma migrate deploy
```

## Maintenance Schedule

### Daily
- Monitor application health
- Check error logs
- Verify backup completion

### Weekly
- Security audit
- Performance review
- Dependency updates

### Monthly
- Full system backup
- SSL certificate check
- Capacity planning review

### Quarterly
- Security penetration testing
- Performance optimization review
- Disaster recovery testing

## Support and Documentation

### Internal Documentation
- API documentation: `/docs/api`
- Component library: `/docs/components`
- Database schema: `/docs/database`

### External Resources
- Next.js documentation: https://nextjs.org/docs
- Prisma documentation: https://www.prisma.io/docs
- PWA best practices: https://web.dev/progressive-web-apps/

### Emergency Contacts
- Development Team: dev-team@company.com
- DevOps Team: devops@company.com
- Database Admin: dba@company.com

---

This deployment guide should be reviewed and updated regularly to reflect changes in the application architecture and deployment procedures.