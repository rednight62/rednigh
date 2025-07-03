import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import oauthConfig from '../config/oauth.js';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id,
      role: user.role,
      email: user.email
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: '1d' }
  );
};

// Handle OAuth authentication callback
const handleOAuthCallback = async (accessToken, refreshToken, profile, done) => {
  try {
    const provider = profile.provider || 'github'; // Default to github if provider is not set
    const user = await User.findOrCreate(profile, provider);
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
};

// Serialize user for session
const serializeUser = (user, done) => {
  done(null, user.id);
};

// Deserialize user from session
const deserializeUser = async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
};

// Handle successful authentication
const handleAuthSuccess = (req, res) => {
  const token = generateToken(req.user);
  
  // Check for redirect_uri in state parameter
  let redirectUri = oauthConfig.frontend.successRedirect;
  if (req.query.state && req.query.state.includes('redirect_uri=')) {
    const match = req.query.state.match(/redirect_uri=([^&]*)/);
    if (match && match[1]) {
      redirectUri = decodeURIComponent(match[1]);
    }
  }
  
  // Add token to redirect URL
  const separator = redirectUri.includes('?') ? '&' : '?';
  const redirectUrl = `${redirectUri}${separator}token=${token}`;
  
  res.redirect(redirectUrl);
};

// Handle authentication failure
const handleAuthFailure = (req, res) => {
  res.redirect(`${oauthConfig.frontend.failureRedirect}?error=auth_failed`);
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -twoFASecret');
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Logout user
const logout = (req, res) => {
  req.logout(() => {
    res.redirect(oauthConfig.frontend.failureRedirect);
  });
};

export {
  generateToken,
  handleOAuthCallback,
  serializeUser,
  deserializeUser,
  handleAuthSuccess,
  handleAuthFailure,
  getCurrentUser,
  logout
};
