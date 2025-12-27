const express = require('express');
const router = express.Router();

// Example route
router.get('/', (req, res) => {
  res.send('API is working');
});

// Add more routes here as needed

module.exports = router;