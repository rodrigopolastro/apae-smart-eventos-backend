const express = require('express');
const router = express.Router();
const db = require('../db/db');
const httpStatus = require('../constants/httpStatusesCodes');

// Get ticket by id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tickets WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      res.status(httpStatus.NOT_FOUND).json({ message: 'Ticket Not Found.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

// purchase ticket
router.post('/purchase', async (req, res) => {
  try {
    if (!req.body.ticketTypeId || !req.body.associateId) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: 'Inform the associate and the ticket type' });
    }

    const [result] = await db.execute(
      `INSERT INTO tickets (ticket_type_id, associate_id, status)
        VALUES (?, ?, ?)`,
      [req.body.ticketTypeId, req.body.associateId, 'not used']
    );
    res.status(httpStatus.CREATED).json({ ticketId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
