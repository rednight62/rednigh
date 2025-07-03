import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { Strategy as TwitterStrategy } from 'passport-twitter-2';
import User from '../models/User.js';
import oauthConfig from './oauth.js';
import { serializeUser, deserializeUser, handleOAuthCallback } from '../controllers/authController.js';

// Serialize and deserialize user
passport.serializeUser(serializeUser);
passport.deserializeUser(deserializeUser);

// JWT Strategy (for API authentication)
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    const user = await User.findById(payload.id);
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

// Google Strategy
if (oauthConfig.google.clientID) {
  passport.use(new GoogleStrategy({
    clientID: oauthConfig.google.clientID,
    clientSecret: oauthConfig.google.clientSecret,
    callbackURL: oauthConfig.google.callbackURL,
    passReqToCallback: true
  }, handleOAuthCallback));
}

// GitHub Strategy
if (oauthConfig.github.clientID) {
  passport.use(new GitHubStrategy({
    clientID: oauthConfig.github.clientID,
    clientSecret: oauthConfig.github.clientSecret,
    callbackURL: oauthConfig.github.callbackURL,
    scope: oauthConfig.github.scope,
    passReqToCallback: true
  }, handleOAuthCallback));
}

// LinkedIn Strategy
if (oauthConfig.linkedin.clientID) {
  passport.use(new LinkedInStrategy({
    clientID: oauthConfig.linkedin.clientID,
    clientSecret: oauthConfig.linkedin.clientSecret,
    callbackURL: oauthConfig.linkedin.callbackURL,
    scope: oauthConfig.linkedin.scope,
    state: true,
    passReqToCallback: true
  }, handleOAuthCallback));
}

// Twitter Strategy
if (oauthConfig.twitter.consumerKey) {
  passport.use(new TwitterStrategy({
    consumerKey: oauthConfig.twitter.consumerKey,
    consumerSecret: oauthConfig.twitter.consumerSecret,
    callbackURL: oauthConfig.twitter.callbackURL,
    includeEmail: true,
    passReqToCallback: true
  }, handleOAuthCallback));
}

export default passport;
