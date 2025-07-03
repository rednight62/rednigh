import User from '../models/User.js';

async function admin(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin access required' });
    }
    next();
  } catch {
    res.status(500).json({ msg: 'Server error' });
  }
}

export default admin;
