const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Example route
router.get('/', (req, res) => {
  res.send('API is working');
});

// Get user interests
router.get('/user/interests/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ interests: user.interests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get interests' });
  }
});

// Update user interests
router.put('/user/interests', async (req, res) => {
  try {
    const { userId, interests } = req.body;
    await User.findByIdAndUpdate(userId, { interests });
    res.json({ message: 'Interests updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update interests' });
  }
});

// Add more routes here as needed

module.exports = router;