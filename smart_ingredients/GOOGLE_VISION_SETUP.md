# Google Vision API Setup Guide

## Quick Setup Steps:

### 1. Get Google Cloud Account
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Sign in with your Google account
- Create a new project (or use existing)

### 2. Enable Vision API
- Go to **APIs & Services** → **Library**
- Search for "Vision API"
- Click **Enable**

### 3. Create API Key
- Go to **APIs & Services** → **Credentials**
- Click **Create Credentials** → **API Key**
- Copy the API key (starts with `AIzaSyC...`)

### 4. Update Your App
Replace `YOUR_GOOGLE_VISION_API_KEY` in `lib/ocrConfig.ts` with your actual API key:

```typescript
export const GOOGLE_VISION_CONFIG = {
  apiKey: 'AIzaSyC...your-actual-api-key-here',
  apiUrl: 'https://vision.googleapis.com/v1/images:annotate',
};
```

### 5. Test
- Restart your app
- Scan a receipt
- You should see "Processing image with Google Vision API (Online)..."

## Cost Information:
- Google Vision API has a **free tier**: 1,000 requests per month
- After that: $1.50 per 1,000 requests
- Perfect for testing and small projects!

## Security Note:
- Never commit your API key to version control
- Consider using environment variables for production
- You can restrict the API key to specific apps/IPs in Google Cloud Console
