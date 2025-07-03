# OAuth Provider Setup Guide

This guide will help you set up OAuth authentication with Google, GitHub, LinkedIn, and Twitter (X) for your Fullstack Platform.

## Prerequisites

1. Node.js and npm installed
2. MongoDB installed and running
3. A domain name (for production) or `localhost` for development

## Setting Up OAuth Providers

### 1. Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application" as the application type
6. Add the following authorized redirect URIs:
   - `http://localhost:5000/api/oauth/google/callback` (development)
   - `https://yourdomain.com/api/oauth/google/callback` (production)
7. Copy the Client ID and Client Secret to your `.env` file

### 2. GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - Homepage URL: `http://localhost:5173` (development) or your production URL
   - Authorization callback URL: `http://localhost:5000/api/oauth/github/callback` (development) or your production URL
4. Click "Register application"
5. Generate a new client secret
6. Copy the Client ID and Client Secret to your `.env` file

### 3. LinkedIn OAuth Setup

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app
3. In the "Auth" tab, add the following redirect URLs:
   - `http://localhost:5000/api/oauth/linkedin/callback` (development)
   - `https://yourdomain.com/api/oauth/linkedin/callback` (production)
4. Under "Products" find "Sign In with LinkedIn" and request access
5. Once approved, go to the "Auth" tab and copy the Client ID and Client Secret to your `.env` file

### 4. Twitter (X) OAuth Setup

1. Go to the [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new project and app
3. In the app settings, enable 3-legged OAuth
4. Set the callback URLs:
   - `http://localhost:5000/api/oauth/twitter/callback` (development)
   - `https://yourdomain.com/api/oauth/twitter/callback` (production)
5. Set the website URL to `http://localhost:5173` (development) or your production URL
6. In the "Keys and tokens" tab, generate your API key and secret
7. Copy the API Key and API Secret to your `.env` file as `TWITTER_CONSUMER_KEY` and `TWITTER_CONSUMER_SECRET`

## Environment Variables

Update your `.env` file with the credentials obtained from each provider:

```env
# Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/oauth/google/callback

# GitHub
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/oauth/github/callback

# LinkedIn
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_CALLBACK_URL=http://localhost:5000/api/oauth/linkedin/callback

# Twitter (X)
TWITTER_CONSUMER_KEY=your_twitter_consumer_key
TWITTER_CONSUMER_SECRET=your_twitter_consumer_secret
TWITTER_CALLBACK_URL=http://localhost:5000/api/oauth/twitter/callback

# Frontend URLs
FRONTEND_URL=http://localhost:5173
FRONTEND_LOGIN_URL=http://localhost:5173/login
```

## Testing the OAuth Flow

1. Start your backend server: `npm run dev` in the `server` directory
2. Start your frontend: `npm run dev` in the `client` directory
3. Visit `http://localhost:5173` in your browser
4. Click on any of the OAuth provider buttons to test the authentication flow

## Troubleshooting

1. **Callback URL Mismatch**: Ensure the callback URLs in your OAuth app settings match exactly with what's in your `.env` file
2. **CORS Issues**: Make sure your frontend URL is included in the CORS configuration in `server/index.js`
3. **Session Issues**: Ensure MongoDB is running and the session store can connect to it
4. **HTTPS in Production**: In production, ensure you have HTTPS set up as most OAuth providers require it for production environments

## Security Notes

1. Never commit your `.env` file to version control
2. Use strong, unique secrets for `JWT_SECRET` and `SESSION_SECRET`
3. In production, set `NODE_ENV=production`
4. Use environment variables for all sensitive configuration
5. Regularly rotate your OAuth client secrets

## Next Steps

1. Implement user role management (admin/user)
2. Add email verification for local signup
3. Implement account linking for users who sign up with multiple providers
4. Set up proper logging and monitoring for OAuth flows
