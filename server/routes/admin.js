import express from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import admin from '../middleware/admin.js';
import axios from 'axios';

const router = express.Router();

// Get all users
router.get('/users', auth, admin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Promote/demote user
router.put('/users/:id/role', auth, admin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ msg: 'Invalid role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', auth, admin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: 'User deleted' });
  } catch {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Multi-provider AI Agent endpoint
router.post('/ai-agent', auth, admin, async (req, res) => {
  req.app.get('broadcastEvent')({
    type: 'admin',
    action: 'ai-agent',
    user: req.user?.username,
    provider: req.body.provider,
    timestamp: Date.now()
  });
  const { prompt, provider, model, googleParams } = req.body;
  try {
    let response;
    if (provider === 'openai') {
      // GPT-4.0/4.1
      const openaiRes = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024
      }, {
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
      });
      response = openaiRes.data.choices[0].message.content;
    } else if (provider === 'claude') {
      // Claude 3.5, 3.7, 4
      const anthropicRes = await axios.post('https://api.anthropic.com/v1/messages', {
        model: model || 'claude-3-opus-20240229',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      }, {
        headers: {
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      });
      response = anthropicRes.data.content[0].text;
    } else if (provider === 'deepseek') {
      // DeepSeek R1, V3
      const deepseekRes = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: model || 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024
      }, {
        headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` }
      });
      response = deepseekRes.data.choices[0].message.content;
    } else if (provider === 'google') {
      // Google APIs (search, maps, shopping, etc.)
      // Example: Google Custom Search API
      const { query, cx } = googleParams || {};
      const url = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_API_KEY}&q=${encodeURIComponent(query)}&cx=${cx}`;
      const googleRes = await axios.get(url);
      response = JSON.stringify(googleRes.data.items);
    } else {
      response = 'Provider/model not supported.';
    }
    res.json({ response });
  } catch (err) {
    res.status(500).json({ response: 'AI agent error', error: err.message });
  }
});

export default router;
