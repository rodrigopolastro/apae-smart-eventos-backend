const express = require('express');
const router = express.Router();
const db = require('../db/db');
const httpStatus = require('../constants/httpStatusesCodes');
const uuid = require('uuid');

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

// get ticket info by qrCodeId for printing
router.get('/printTicket/:qrCodeId', async (req, res) => {
  try {
    if (!req.params.qrCodeId) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: 'Inform the ticket QR Code' });
    }

    const [rows] = await db.query(
      `
        SELECT
            t.id,
            t.ticket_type_id,
            t.associate_id,
            t.status,
            t.used_at,
            t.purchased_at,
            u.name,
            etp.name,
            etp.description,
            etp.price,
            e.name,
            e.location,
            e.date_time
        FROM tickets t
        INNER JOIN users u ON u.id = t.associate_id        
        INNER JOIN event_ticket_types etp ON etp.id = t.ticket_type_id
        INNER JOIN events e ON e.id = etp.event_id
        WHERE qr_code_id = ?`,
      [req.params.qrCodeId]
    );
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

    const ticketQrCodeUuid = uuid.v4();
    const [result] = await db.execute(
      'INSERT INTO tickets (ticket_type_id, associate_id, status, qr_code_id) VALUES (?, ?, ?, ?)',
      [req.body.ticketTypeId, req.body.associateId, 'not used', ticketQrCodeUuid]
    );
    res.status(httpStatus.CREATED).json({ ticketId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
