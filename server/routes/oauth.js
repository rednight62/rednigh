import express from 'express';
import passport from 'passport';
import { handleAuthSuccess, getCurrentUser, logout } from '../controllers/authController.js';

const router = express.Router();

// Google OAuth routes
router.get('/google', (req, res, next) => {
  const { redirect_uri } = req.query;
  const state = redirect_uri ? `redirect_uri=${encodeURIComponent(redirect_uri)}` : undefined;
  
  const authOptions = {
    scope: ['profile', 'email'],
    state
  };
  
  passport.authenticate('google', authOptions)(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false,
    failureMessage: true
  }),
  handleAuthSuccess
);

// GitHub OAuth routes
router.get('/github', (req, res, next) => {
  const { redirect_uri } = req.query;
  const state = redirect_uri ? `redirect_uri=${encodeURIComponent(redirect_uri)}` : undefined;
  
  const authOptions = {
    scope: ['user:email'],
    state
  };
  
  passport.authenticate('github', authOptions)(req, res, next);
});

router.get('/github/callback',
  passport.authenticate('github', { 
    failureRedirect: '/login',
    session: false,
    failureMessage: true
  }),
  handleAuthSuccess
);

// LinkedIn OAuth routes
router.get('/linkedin', (req, res, next) => {
  const { redirect_uri } = req.query;
  const state = redirect_uri ? `redirect_uri=${encodeURIComponent(redirect_uri)}` : undefined;
  
  const authOptions = {
    scope: ['r_emailaddress', 'r_liteprofile'],
    state
  };
  
  passport.authenticate('linkedin', authOptions)(req, res, next);
});

router.get('/linkedin/callback',
  passport.authenticate('linkedin', { 
    failureRedirect: '/login',
    session: false,
    failureMessage: true
  }),
  handleAuthSuccess
);

// Twitter OAuth routes
router.get('/twitter', (req, res, next) => {
  const { redirect_uri } = req.query;
  const state = redirect_uri ? `redirect_uri=${encodeURIComponent(redirect_uri)}` : undefined;
  
  const authOptions = state ? { state } : {};
  
  passport.authenticate('twitter', authOptions)(req, res, next);
});

router.get('/twitter/callback',
  passport.authenticate('twitter', { 
    failureRedirect: '/login',
    session: false 
  }),
  handleAuthSuccess
);

// Logout route
router.get('/logout', logout);

// Get current user
router.get('/current', 
  passport.authenticate('jwt', { session: false }), 
  getCurrentUser
);

export default router;
