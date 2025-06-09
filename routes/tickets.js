// routes/tickets.js

const express = require('express');
const router = express.Router();
// Assuming you're using dotenv for local development
require('dotenv').config();

router.get('/tickets/:ticketId/generate-pdf', async (req, res) => {
  try {
    const ticketId = req.params.ticketId;

    // --- LINE 41 IS LIKELY HERE OR AROUND HERE ---
    const pdfGeneratorServiceUrl = process.env.PDF_GENERATOR_SERVICE_URL; // This is the variable in question

    // Debugging line:
    console.log('PDF Generator URL:', pdfGeneratorServiceUrl);

    if (!pdfGeneratorServiceUrl) {
      console.error('Error: PDF_GENERATOR_SERVICE_URL is not defined in environment variables.');
      return res.status(500).json({ error: 'PDF generator service URL is not configured.' });
    }

    const response = await fetch(`${pdfGeneratorServiceUrl}/generate-ticket-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticketId: ticketId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from PDF generator service: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ error: 'Failed to generate PDF' });
    }

    const pdfBlob = await response.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBlob).toString('base64');

    res.status(200).json({ pdf: pdfBase64 });

  } catch (error) {
    console.error('Error in PDF generation route:', error);
    res.status(500).json({ error: 'Internal server error during PDF generation.' });
  }
});

module.exports = router;