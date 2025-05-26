const express = require('express');
const router = express.Router();
const db = require('../db/db');
const httpStatus = require('../constants/httpStatusesCodes');
const jwt = require('jsonwebtoken');
require('dotenv').config();

router.post('/signup', async (req, res) => {
  try {
    if (!req.body.email || !req.body.password || !req.body.name) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: 'Bad Request: Missing info' });
    }

    const [rows] = await db.query('SELECT 1 FROM users WHERE email = ?', [req.body.email]);
    if (rows.length > 0) {
      return res.status(httpStatus.CONFLICT).json({ message: 'This email is already in use.' });
    }

    const [result] = await db.execute(
      'INSERT INTO users (email, password, name, user_type) VALUES (?, ?, ? ,?)',
      [req.body.email, req.body.password, req.body.name, 'associate']
    );

    const user = {
      id: result.insertId,
      type: 'associate',
    };
    const accessToken = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(httpStatus.CREATED).json({ user, accessToken, refreshToken });
  } catch (error) {
    console.error(error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    if (!req.body.email || !req.body.password) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: 'You must inform email and password.' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [
      req.body.email,
      req.body.password,
    ]);

    if (rows.length === 0) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Invalid email or password.' });
    }

    const user = {
      id: rows[0].id,
      type: rows[0].user_type,
    };
    const accessToken = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ user, accessToken, refreshToken });
  } catch (error) {
    console.error(error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
  }
});

module.exports = router;
