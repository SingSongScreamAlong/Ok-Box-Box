# 🔒 Security Deployment Checklist - iRacing PitBox

**Before deploying to production, complete ALL items in this checklist.**

---

## ✅ **CRITICAL SECURITY ITEMS** (MUST DO)

### 1. Environment Variables Configuration

**Status**: ⚠️ **REQUIRED**

All hardcoded localhost URLs have been replaced with environment variables. You MUST configure:

```bash
# Backend Services
BACKEND_URL=https://your-domain.com/api
SERVER_URL=https://your-domain.com
RELAY_AGENT_URL=wss://your-domain.com/relay

# API Security
API_KEY=<generate with: openssl rand -hex 32>
SERVICE_TOKEN=<generate with: openssl rand -hex 32>

# JWT Authentication
JWT_SECRET=<generate with: openssl rand -hex 32>
# MINIMUM 32 characters - server will REJECT weak secrets in production

# Database
DATABASE_URL=postgresql://user:password@host:5432/pitbox
PG_CONNECTION_STRING=<same as DATABASE_URL>

# AI Services
OPENAI_API_KEY=sk-...
GRADIENT_AI_API_KEY=<your key>
ELEVENLABS_API_KEY=<your key>
```

**Generate secure secrets**:
```bash
# JWT Secret (64 characters recommended)
openssl rand -hex 32

# API Keys
openssl rand -hex 32

# Database Password
openssl rand -base64 24
```

---

### 2. JWT Secret Validation

**Status**: ✅ **IMPLEMENTED**

**What was fixed**:
- Server now **THROWS ERROR** in production for weak JWT secrets
- Minimum 32 characters enforced
- Blocks common weak values: `'secret'`, `'default'`, `'test'`, `'password'`, `'12345'`

**Test it works**:
```bash
# This should FAIL in production:
JWT_SECRET=weak_secret npm start

# This should SUCCEED:
JWT_SECRET=$(openssl rand -hex 32) npm start
```

**Location**: `server/src/config.ts:102-124`

---

### 3. API Rate Limiting

**Status**: ✅ **IMPLEMENTED**

**Protection enabled for**:
- General API: 100 requests / 15 minutes
- Telemetry uploads: 600 requests / minute (high frequency)
- AI coaching: 10 requests / minute (expensive)
- Authentication: 5 attempts / 15 minutes (brute force)
- Sensitive operations: 3 requests / hour
- Data exports: 20 exports / 5 minutes

**To use in server routes**:
```typescript
import { apiLimiter, telemetryLimiter, aiLimiter } from './middleware/rate-limit';

app.use('/api/', apiLimiter);
app.use('/api/telemetry', telemetryLimiter);
app.use('/api/ai/', aiLimiter);
```

**Location**: `server/src/middleware/rate-limit.ts`

---

### 4. SQL Injection Protection

**Status**: ✅ **IMPLEMENTED**

**What was fixed**:
- All database queries use parameterized statements
- Created `SafeDB` wrapper class
- Input validation middleware
- Query builder for dynamic queries

**Verify all queries use parameterization**:
```typescript
// ✅ GOOD - Parameterized
await pool.query('SELECT * FROM users WHERE email = $1', [email]);

// ❌ BAD - String interpolation (will be caught)
await pool.query(`SELECT * FROM users WHERE email = '${email}'`);
```

**Use SafeDB wrapper**:
```typescript
import { SafeDB } from './middleware/sql-injection-guard';

const safeDB = new SafeDB(pool);
await safeDB.query('SELECT * FROM users WHERE id = $1', [userId]);
```

**Add input validation**:
```typescript
import { sanitizeInputs } from './middleware/sql-injection-guard';

app.use(sanitizeInputs); // Blocks SQL injection patterns
```

**Location**: `server/src/middleware/sql-injection-guard.ts`

---

## 🔐 **RECOMMENDED SECURITY ENHANCEMENTS**

### 5. HTTPS/TLS Configuration

**Status**: ⚠️ **TODO**

**Required for production**:
```bash
# Use Let's Encrypt for free SSL certificates
certbot --nginx -d your-domain.com

# Or configure Nginx with SSL
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
}
```

**DigitalOcean App Platform**: Auto-provides SSL ✅

---

### 6. CORS Configuration

**Status**: ⚠️ **REVIEW REQUIRED**

**Current**: Check `server/src/server.ts` for CORS settings

**Production recommendation**:
```typescript
app.use(cors({
  origin: [
    'https://your-domain.com',
    'https://dashboard.your-domain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**DO NOT USE** in production:
```typescript
app.use(cors({ origin: '*' })); // ❌ Allows any origin
```

---

### 7. Helmet.js Security Headers

**Status**: ⚠️ **RECOMMENDED**

**Install and configure**:
```bash
npm install helmet
```

```typescript
import helmet from 'helmet';

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
  }
}));
```

---

### 8. Environment-Specific Settings

**Status**: ⚠️ **VERIFY**

**Ensure**:
```bash
# Production
NODE_ENV=production

# Development
NODE_ENV=development
```

**Check behavior**:
- Production: Strict JWT enforcement
- Production: No stack traces in errors
- Production: Compressed responses
- Development: Detailed error messages

---

## 📊 **iRACING-SPECIFIC SECURITY**

### 9. iRacing API Keys Protection

**Protect iRacing credentials**:
```bash
# Never commit these to git
IRACING_USERNAME=<your username>
IRACING_PASSWORD=<your password>
IRACING_CUSTOMER_ID=<your customer ID>
```

Add to `.gitignore`:
```
.env
.env.production
.env.local
**/config.json
*credentials*
```

---

### 10. Telemetry Data Validation

**Validate iRacing telemetry**:
```typescript
function validateTelemetry(data: any): boolean {
  // Speed range check (0-400 km/h reasonable for iRacing)
  if (data.Speed < 0 || data.Speed > 400) return false;

  // RPM range check
  if (data.RPM < 0 || data.RPM > 20000) return false;

  // Throttle/Brake range (0-1)
  if (data.Throttle < 0 || data.Throttle > 1) return false;
  if (data.Brake < 0 || data.Brake > 1) return false;

  return true;
}
```

---

## 🚀 **DEPLOYMENT VERIFICATION**

### Pre-Deployment Tests

**Run these tests before going live**:

```bash
# 1. Build succeeds
npm run build
# Expected: No errors

# 2. Environment variables loaded
node -e "console.log(process.env.JWT_SECRET?.length >= 32)"
# Expected: true

# 3. Database connection
psql $DATABASE_URL -c "SELECT 1"
# Expected: Connection successful

# 4. API rate limiting works
curl -H "Content-Type: application/json" \
  https://your-api.com/health
# Expected: 200 OK (first 100 requests)
# Expected: 429 Too Many Requests (after 100)

# 5. JWT authentication works
curl -H "Authorization: Bearer invalid_token" \
  https://your-api.com/api/protected
# Expected: 401 Unauthorized
```

---

## 📝 **POST-DEPLOYMENT MONITORING**

### Monitor These Metrics

**Security Events**:
- [ ] Failed authentication attempts
- [ ] Rate limit violations
- [ ] SQL injection attempt blocks
- [ ] Invalid telemetry data submissions

**Performance**:
- [ ] API response times < 200ms
- [ ] Telemetry ingestion rate
- [ ] Database connection pool usage
- [ ] Memory/CPU usage

**Logs to Watch**:
```bash
# Authentication failures
grep "401 Unauthorized" /var/log/pitbox/access.log

# Rate limit hits
grep "429 Too Many Requests" /var/log/pitbox/access.log

# SQL injection attempts
grep "SQL injection" /var/log/pitbox/error.log

# Database errors
grep "Database error" /var/log/pitbox/error.log
```

---

## ✅ **FINAL CHECKLIST**

Before production deployment, verify:

- [ ] All environment variables configured with strong values
- [ ] JWT_SECRET is 32+ characters and cryptographically random
- [ ] Database credentials are strong and unique
- [ ] HTTPS/SSL enabled for all endpoints
- [ ] CORS configured with specific allowed origins
- [ ] Rate limiting applied to all API routes
- [ ] SQL injection protection verified (all queries parameterized)
- [ ] Input validation middleware applied
- [ ] Error messages don't leak sensitive information
- [ ] Logging configured for security events
- [ ] Backup strategy in place
- [ ] Incident response plan documented

---

## 🆘 **SECURITY INCIDENT RESPONSE**

**If you detect a security issue**:

1. **Immediate**: Revoke compromised credentials
   ```bash
   # Rotate JWT secret
   JWT_SECRET=$(openssl rand -hex 32)
   # Restart services
   ```

2. **Within 1 hour**: Patch vulnerability
3. **Within 24 hours**: Audit for damage
4. **Within 1 week**: Post-mortem and prevention

**Emergency contacts**:
- Server admin: [your contact]
- Database admin: [your contact]
- DigitalOcean support: https://cloud.digitalocean.com/support

---

## 📚 **ADDITIONAL RESOURCES**

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [DigitalOcean Security](https://docs.digitalocean.com/products/security/)

---

**Last Updated**: 2025-11-29
**Review Frequency**: Monthly
**Owner**: DevOps Team

**Status**: ✅ Core security implemented, ⚠️ Review production settings before deployment
