import 'dotenv/config';

const oauthConfig = {
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
  },
  github: {
    clientID: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackURL: process.env.GITHUB_CALLBACK_URL || '/auth/github/callback',
    scope: ['user:email']
  },
  linkedin: {
    clientID: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    callbackURL: process.env.LINKEDIN_CALLBACK_URL || '/auth/linkedin/callback',
    scope: ['r_emailaddress', 'r_liteprofile']
  },
  twitter: {
    consumerKey: process.env.TWITTER_CONSUMER_KEY || '',
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET || '',
    callbackURL: process.env.TWITTER_CALLBACK_URL || '/auth/twitter/callback',
    includeEmail: true
  },
  // Frontend URLs for redirection after authentication
  frontend: {
    successRedirect: process.env.FRONTEND_URL || 'http://localhost:5173',
    failureRedirect: process.env.FRONTEND_LOGIN_URL || 'http://localhost:5173/login',
  }
};

export default oauthConfig;
