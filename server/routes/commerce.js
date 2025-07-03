import express from 'express';
import axios from 'axios';
import auth from '../middleware/auth.js';
import admin from '../middleware/admin.js';

const router = express.Router();

// Amazon Product Search (placeholder)
router.get('/amazon/search', auth, admin, async (req, res) => {
  req.app.get('broadcastEvent')({
    type: 'commerce',
    action: 'search',
    provider: 'amazon',
    user: req.user?.username,
    query: req.query.query,
    timestamp: Date.now()
  });
  // TODO: Use signed requests for Amazon PA API
  res.json({ msg: 'Amazon integration coming soon.' });
});

// eBay Product Search (placeholder)
router.get('/ebay/search', auth, async (req, res) => {
  req.app.get('broadcastEvent')({
    type: 'commerce',
    action: 'search',
    provider: 'ebay',
    user: req.user?.username,
    query: req.query.query,
    timestamp: Date.now()
  });
  const { query } = req.query;
  try {
    const url = `https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SECURITY-APPNAME=${process.env.EBAY_APP_ID}&RESPONSE-DATA-FORMAT=JSON&keywords=${encodeURIComponent(query)}`;
    const ebayRes = await axios.get(url);
    res.json(ebayRes.data);
  } catch (err) {
    res.status(500).json({ msg: 'eBay API error', error: err.message });
  }
});

// Shopify Product Search (placeholder)
router.get('/shopify/products', auth, admin, async (req, res) => {
  // TODO: Use Storefront API
  res.json({ msg: 'Shopify integration coming soon.' });
});

// Stripe Transactions (placeholder)
router.get('/stripe/transactions', auth, admin, async (req, res) => {
  // TODO: Use Stripe API
  res.json({ msg: 'Stripe integration coming soon.' });
});

// PayPal Transactions (placeholder)
router.get('/paypal/transactions', auth, admin, async (req, res) => {
  // TODO: Use PayPal API
  res.json({ msg: 'PayPal integration coming soon.' });
});

// Walmart Product Search (placeholder)
router.get('/walmart/search', auth, admin, async (req, res) => {
  // TODO: Use Walmart API
  res.json({ msg: 'Walmart integration coming soon.' });
});

// AliExpress Product Search (placeholder)
router.get('/aliexpress/search', auth, admin, async (req, res) => {
  // TODO: Use AliExpress API
  res.json({ msg: 'AliExpress integration coming soon.' });
});

export default router;
