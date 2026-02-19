# iRacing OAuth Environment Variables

## Required Variables

These environment variables must be set for iRacing OAuth to function:

```bash
# iRacing OAuth Client Credentials
# Obtained from iRacing OAuth application approval
IRACING_CLIENT_ID=okboxbox
IRACING_CLIENT_SECRET=<your_client_secret>

# Token Encryption Key (32 bytes, hex encoded)
# Generate with: openssl rand -hex 32
IRACING_TOKEN_ENCRYPTION_KEY=<64_character_hex_string>

# Redis URL for OAuth state storage
REDIS_URL=redis://localhost:6379
```

## Optional Variables

```bash
# iRacing OAuth Base URL (override for testing)
# Default: https://oauth.iracing.com
IRACING_OAUTH_BASE_URL=https://oauth.iracing.com
```

## Redirect URIs

The following redirect URIs must be registered with iRacing:

| Environment | Redirect URI |
|-------------|--------------|
| Production | `https://app.okboxbox.com/api/oauth/iracing/callback` |
| Staging | `https://staging.okboxbox.com/api/oauth/iracing/callback` |
| Development | `http://localhost:3001/api/oauth/iracing/callback` |

> **Note:** The `/api/` prefix is required so DigitalOcean routes the callback
> to the API server instead of the static site SPA.

## Generation Commands

```bash
# Generate encryption key
openssl rand -hex 32

# Example output: a1b2c3d4e5f6...64 characters
```

## DigitalOcean Configuration

Add these as App-Level Environment Variables in DigitalOcean App Platform:

1. `IRACING_CLIENT_ID` = `okboxbox`
2. `IRACING_CLIENT_SECRET` = (encrypted, from iRacing)
3. `IRACING_TOKEN_ENCRYPTION_KEY` = (encrypted, generate fresh)
4. `REDIS_URL` = (from DigitalOcean Redis cluster)
