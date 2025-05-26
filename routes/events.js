const express = require('express');
const router = express.Router();
const db = require('../db/db');
const httpStatus = require('../constants/httpStatusesCodes');

router.get('/', async (req, res) => {
  const [events] = await db.query('SELECT * FROM events');
  res.json(events);
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      res.status(404).json({ message: 'Event Not Found.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.get('/:id/ticketTypes', async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: 'Event id not sent or invalid.' });
    }

    const [rows] = await db.query('SELECT * FROM event_ticket_types WHERE event_id = ?', [
      req.params.id,
    ]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
