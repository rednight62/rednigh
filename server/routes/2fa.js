import express from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Enable 2FA (generate secret, return QR)
router.post('/enable', auth, async (req, res) => {
  const secret = speakeasy.generateSecret({ name: `CosmicPlatform (${req.user.username})` });
  await User.findByIdAndUpdate(req.user.id, { twoFASecret: secret.base32, twoFAEnabled: true });
  const qr = await QRCode.toDataURL(secret.otpauth_url);
  res.json({ qr, secret: secret.base32 });
});

// Verify 2FA code
router.post('/verify', auth, async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user.id);
  const verified = speakeasy.totp.verify({
    secret: user.twoFASecret,
    encoding: 'base32',
    token
  });
  if (verified) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, msg: 'Invalid 2FA token' });
  }
});

// Disable 2FA
router.post('/disable', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { twoFASecret: '', twoFAEnabled: false });
  res.json({ success: true });
});

export default router;
