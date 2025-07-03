import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  console.log('Registration attempt with data:', { 
    username: req.body.username,
    hasPassword: !!req.body.password 
  });
  
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ 
        success: false, 
        msg: 'Username and password are required' 
      });
    }
    
    const existingUser = await User.findOne({ 
      $or: [
        { username },
        { email: email || '' }
      ]
    });
    
    if (existingUser) {
      console.log('User already exists:', existingUser.username);
      return res.status(400).json({ 
        success: false, 
        msg: 'Username or email already in use' 
      });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    const user = new User({ 
      username, 
      email: email || `${username}@example.com`,
      password: hash 
    });
    
    await user.save();
    console.log('User registered successfully:', username);
    
    res.status(201).json({ 
      success: true, 
      msg: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  console.log('Login attempt for user:', req.body.username);
  
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ 
        success: false, 
        msg: 'Username and password are required' 
      });
    }
    
    const user = await User.findOne({ 
      $or: [
        { username },
        { email: username } // Allow login with email or username
      ]
    }).select('+password');
    
    if (!user) {
      console.log('User not found:', username);
      return res.status(400).json({ 
        success: false, 
        msg: 'Invalid username or password' 
      });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Invalid password for user:', username);
      return res.status(400).json({ 
        success: false, 
        msg: 'Invalid username or password' 
      });
    }
    
    // Generate token
    const token = jwt.sign(
      { 
        id: user._id,
        username: user.username,
        email: user.email
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    console.log('Login successful for user:', username);
    
    res.json({ 
      success: true, 
      token, 
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      },
      expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

export default router;
