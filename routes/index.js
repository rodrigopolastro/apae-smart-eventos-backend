const express = require('express');
const router = express.Router();

router.get('/', function (req, res) {
  res.send('Welcome to APAE-SMART-EVENTOS api!');
});

module.exports = router;
