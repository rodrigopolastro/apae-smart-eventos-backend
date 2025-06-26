const express = require('express');
const router = express.Router();
const db = require('../db/db');
const httpStatus = require('../constants/httpStatusesCodes');
const { generateSignedUrl } = require('../services/generateSignedUrl');

// get all events
router.get('/', async (req, res) => {
  const [events] = await db.query('SELECT * FROM events');
  res.json(events);
});

// get single event by id
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

// get ticket types of event
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

// get tickets of event
router.get('/:id/tickets', async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: 'Event id not sent or invalid.' });
    }

    const [rows] = await db.query(
      `
        SELECT t.*, e.id event_id FROM tickets t
        INNER JOIN event_ticket_types etp ON etp.id = t.ticket_type_id
        INNER JOIN events e ON e.id = etp.event_id 
        WHERE e.id = ?`,
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.get('/:id/imageUrl', async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: 'Event id not sent or invalid.' });
    }

    const [rows] = await db.query(
      'SELECT cover_image_bucket, cover_image_path FROM events WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'Event Not Found.' });
    }
    if (!rows[0].cover_image_bucket || !rows[0].cover_image_path) {
      return res
        .status(httpStatus.OK)
        .json({ imageUrl: null, message: 'Image URL not found for this event.' });
    }

    const bucketName = rows[0].cover_image_bucket;
    const imagePath = rows[0].cover_image_path;
    const imageUrl = await generateSignedUrl(bucketName, `events-covers/${imagePath}`);

    res.json({ imageUrl });
  } catch (error) {
    console.error(error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

// estrutura:
/* 
{
  event: {
    name
    description
    location
    dateTime
    durationMinutes
    eventType
  },
  "ticketPrices": {
    "standard":
    "plus":
    "vip":
  }
  */
router.post('/', async (req, res) => {
  try {
    const event = req.body.event;
    // const ticketTypes = req.body.ticketTypes;
    const ticketPrices = req.body.ticketPrices;
    console.log('body', req.body);
    if (
      !event ||
      !event.name ||
      !event.description ||
      !event.location ||
      !event.dateTime ||
      !event.durationMinutes ||
      !event.eventType
    ) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: 'Request missing info of event' });
    }

    if (!ticketPrices.standard || !ticketPrices.plus || !ticketPrices.vip) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: 'You must provide the prices of standard, plus and vip tickets' });
    }

    // if (!ticketTypes || !Array.isArray(ticketTypes) || ticketTypes.length === 0) {
    //   console.error('"ticketTypes" must be an array with at least one ticket type.');
    //   return res
    //     .status(httpStatus.BAD_REQUEST)
    //     .json({ message: 'Inform the list of ticket types of the event' });
    // }

    const DEFAULT_COVER_IMAGE_BUCKET = 'apae-smart-eventos-bucket';
    const DEFAULT_COVER_IMAGE_PATH = 'placeholder.webp';
    const eventDateTime = new Date(event.dateTime);
    const [result] = await db.execute(
      `INSERT INTO events (
        name, 
        description, 
        location, 
        date_time, 
        duration_minutes, 
        event_type,
        cover_image_bucket,
        cover_image_path
      ) VALUES (?, ?, ? ,?, ?, ?, ?, ?)`,
      [
        event.name,
        event.description,
        event.location,
        eventDateTime,
        event.durationMinutes,
        event.eventType,
        event.coverImageBucket ?? DEFAULT_COVER_IMAGE_BUCKET,
        event.coverImagePath ?? DEFAULT_COVER_IMAGE_PATH,
      ]
    );
    const createdEventId = result.insertId;

    const ticketTypesToInsert = [
      [createdEventId, 'Padrão', 'Ingresso Padrão', parseFloat(ticketPrices.standard), 50],
      [createdEventId, 'Plus', 'Ingresso Plus', parseFloat(ticketPrices.plus), 50],
      [createdEventId, 'VIP', 'Ingresso VIP', parseFloat(ticketPrices.vip), 50],
    ];

    await db.query(
      'INSERT INTO event_ticket_types (event_id, name, description, price, quantity) VALUES ?',
      [ticketTypesToInsert]
    );

    res.json({ message: `Event ${createdEventId} created successfully!` });
  } catch (error) {
    console.error(error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
