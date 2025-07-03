import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: function() { return !this.oauthProvider; }, // Username is required only for local auth
    unique: true 
  },
  email: { 
    type: String, 
    required: function() { return !this.oauthProvider; }, // Email is required only for local auth
    unique: true,
    sparse: true
  },
  password: { 
    type: String, 
    required: function() { return !this.oauthProvider; } // Password is required only for local auth
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  oauthProvider: {
    type: String,
    enum: ['google', 'github', 'linkedin', 'twitter'],
    required: false
  },
  oauthId: {
    type: String,
    required: false,
    sparse: true
  },
  displayName: {
    type: String,
    required: false
  },
  avatar: {
    type: String,
    required: false
  },
  twoFAEnabled: { 
    type: Boolean, 
    default: false 
  },
  twoFASecret: { 
    type: String, 
    default: '' 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add a method to generate JWT token
UserSchema.methods.generateJWT = function() {
  return jwt.sign(
    { 
      id: this._id,
      role: this.role,
      email: this.email
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: '1d' }
  );
};

// Static method to find or create user from OAuth profile
UserSchema.statics.findOrCreate = async function(profile, provider) {
  let user = await this.findOne({ oauthId: profile.id, oauthProvider: provider });
  
  if (!user) {
    // Check if email already exists
    if (profile.emails && profile.emails[0]) {
      user = await this.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // Link OAuth account to existing user
        user.oauthId = profile.id;
        user.oauthProvider = provider;
        await user.save();
        return user;
      }
    }
    
    // Create new user
    user = new this({
      oauthId: profile.id,
      oauthProvider: provider,
      email: profile.emails ? profile.emails[0].value : `${profile.id}@${provider}.com`,
      username: profile.emails ? profile.emails[0].value.split('@')[0] : `${provider}_${profile.id}`,
      displayName: profile.displayName || profile.username || `${provider} User`,
      avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : ''
    });
    
    await user.save();
  }
  
  return user;
};

export default mongoose.model('User', UserSchema);
