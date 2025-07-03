import express from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import admin from '../middleware/admin.js';

const router = express.Router();

// User analytics
router.get('/users', auth, admin, async (req, res) => {
  try {
    const total = await User.countDocuments();
    const admins = await User.countDocuments({ role: 'admin' });
    res.json({ totalUsers: total, adminUsers: admins });
  } catch (err) {
    res.status(500).json({ msg: 'Analytics error', error: err.message });
  }
});

// Placeholder for commerce analytics
router.get('/commerce', auth, admin, async (req, res) => {
  // TODO: Integrate with Stripe/PayPal/Shopify for real stats
  res.json({ sales: 0, revenue: 0 });
});

export default router;
