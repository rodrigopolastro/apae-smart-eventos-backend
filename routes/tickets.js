const express = require('express');
const router = express.Router();
const db = require('../db/db');
const httpStatus = require('../constants/httpStatusesCodes');
const uuid = require('uuid');
const ticketsServices = require('../services/tickets');

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
router.get('/:qrCodeId/printTicket', async (req, res) => {
  try {
    if (!req.params.qrCodeId) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: 'Inform the ticket QR Code' });
    }

    const [rows] = await db.query(
      `SELECT
            t.id ticketId,
            t.ticket_type_id ticketTypeId,
            t.associate_id userId,
            (CASE
                WHEN t.status = 'not used' THEN 'Não utilizado'
                WHEN t.status = 'used' THEN "Utilizado"
                WHEN t.status = 'expired' THEN "Expirado"
                WHEN t.status = 'waiting payment' THEN "Aguardando Pagamento"
                ELSE '...'
            END) AS status,
            t.used_at usedAt,
            t.purchased_at purchasedAt,
            t.qr_code_id qrCodeId,
            u.name userName,
            etp.name ticketType,
            etp.description ticketTypeDescription,
            etp.price price,
            e.name eventName,
            e.location eventLocation,
            e.date_time eventDateTime
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

    const ticketPdf = ticketsServices.generateTicketPdf(rows[0]);
    res.contentType('application/pdf');
    res.send(ticketPdf);
  } catch (error) {
    console.error(error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

// purchase ticket
router.post('/purchase', async (req, res) => {
  /* EXPECTED REQUEST BODY
  {
    "associateId": 1,
    "tickets": [
      {"ticketTypeId": 3},
      {"ticketTypeId": 3}
    ]
  }*/

  try {
    if (!req.body.associateId) {
      console.error('Request missing the "associateId".');
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: 'Inform the associate responsible for the purchase' });
    }

    const [rows] = await db.query('SELECT id, user_type FROM users WHERE id = ?', [
      req.body.associateId,
    ]);
    if (rows.length === 0 || rows[0].user_type !== 'associate') {
      console.error('Invalid "associateId" or user is not an associate.');
      return res
        .status(httpStatus.FORBIDDEN)
        .json({ message: 'Invalid associate or user is not an associate.' });
    }

    if (!req.body.tickets || !Array.isArray(req.body.tickets) || req.body.tickets.length === 0) {
      console.error('"tickets" must bt an array with at least one ticket.');
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: 'Inform the list of tickets to purchase' });
    }

    const tickets = req.body.tickets;
    const associateId = req.body.associateId;
    try {
      const listOfTicketsToInsert = [];
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (!ticket.ticketTypeId) {
          console.error('Each ticket must have a "ticketTypeId".');
          return res
            .status(httpStatus.BAD_REQUEST)
            .json({ message: 'Inform the ticket type for each ticket' });
        }

        const ticketQrCodeUuid = uuid.v4();
        const ticketStatus = 'not used';
        listOfTicketsToInsert.push([
          associateId,
          ticket.ticketTypeId,
          ticketQrCodeUuid,
          ticketStatus,
        ]);
      }

      await db.query(
        'INSERT INTO tickets (associate_id, ticket_type_id, qr_code_id, status) VALUES ?',
        [listOfTicketsToInsert]
      );
    } catch (error) {
      console.error('Transaction error:', error);
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: 'Internal server error.' });
    }

    res.status(httpStatus.CREATED).json({ message: 'Tickets purchased successfully.' });
  } catch (error) {
    console.error(error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

router.get('/:qrCodeId/validateTicket', async (req, res) => {
  try {
    if (!req.params.qrCodeId) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: 'Inform the ticket QR Code' });
    }

    //already used ticket is considered invalid
    const [rows] = await db.query(
      `SELECT (IF(t.status = 'used', 'invalid', 'valid')) AS isTicketValid
        FROM tickets t WHERE t.qr_code_id = ?`,
      [req.params.qrCodeId]
    );

    let isTicketValid;
    if (rows.length > 0) {
      isTicketValid = rows[0].isTicketValid === 'valid';
    } else {
      console.log('invalid ticket code');
      isTicketValid = false;
    }

    res.json({ isTicketValid });
  } catch (error) {
    console.error(error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
