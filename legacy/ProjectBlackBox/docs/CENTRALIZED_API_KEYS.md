# ProjectPitBox - Centralized API Key Setup

## Overview

ProjectPitBox now supports **centralized API key management**, making it easy to distribute to testers without requiring each user to configure their own API keys.

## How It Works

1. **Environment Variables First**: The system checks for `OPENAI_API_KEY` and `ELEVENLABS_API_KEY` environment variables
2. **User Settings Fallback**: If not found in environment, it falls back to user-configured settings
3. **Easy Distribution**: Testers can use the app immediately with your centralized keys

## Setup Instructions

### For Developers/Distributors

1. **Create a `.env` file** in the project root:
   ```bash
   cp .env.example .env
   ```

2. **Add your API keys** to `.env`:
   ```bash
   OPENAI_API_KEY=sk-your-actual-openai-key-here
   ELEVENLABS_API_KEY=your-actual-elevenlabs-key-here
   ```

3. **Load environment variables** before running:
   ```bash
   # Option 1: Use python-dotenv (recommended)
   pip install python-dotenv
   
   # Option 2: Export manually
   export OPENAI_API_KEY=sk-your-key-here
   export ELEVENLABS_API_KEY=your-key-here
   ```

4. **Run the application**:
   ```bash
   python run_pitbox.py
   ```

### For Testers

**No API key configuration needed!** Just run:
```bash
python run_pitbox.py
```

The app will automatically use the centralized API keys provided by the developer.

## Priority Order

The system loads API keys in this order:

1. **Environment variables** (`.env` file or system environment)
2. **User settings** (configured via `python settings_manager.py`)
3. **Empty string** (will prompt for configuration)

## Production Deployment

For production with subscription model:

1. Store API keys securely in environment variables
2. Use a secrets management service (AWS Secrets Manager, etc.)
3. Never commit `.env` file to git (already in `.gitignore`)
4. Rotate keys regularly

## Benefits

✅ **Easy Testing**: Testers don't need their own API keys
✅ **Flexible**: Users can still override with their own keys if needed
✅ **Secure**: `.env` file is gitignored by default
✅ **Subscription Ready**: Centralized keys prepare for subscription model

## Security Notes

- **Never commit `.env` to git**
- The `.env.example` file is safe to commit (contains no real keys)
- For public distribution, consider rate limiting per user
- Monitor API usage to prevent abuse
