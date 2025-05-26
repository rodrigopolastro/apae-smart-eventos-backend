const express = require('express');
const router = express.Router();
const db = require('../db/db');

router.get('/', async (req, res) => {
  const [users] = await db.query('SELECT * FROM users');
  res.json(users);
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    console.log(rows);
    if (rows.length === 0) {
      res.status(404).json({ message: 'User Not Found.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
