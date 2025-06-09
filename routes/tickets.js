const express = require('express');
const router = express.Router();
const db = require('../db/db');
const httpStatus = require('../constants/httpStatusesCodes'); // Certifique-se de que este caminho está correto
const uuid = require('uuid');
const ticketsServices = require('../services/tickets'); // Certifique-se de que este caminho está correto
const { getTicketByQrCodeId } = require('../models/tickets'); // Certifique-se de que este caminho está correto

// --- Rota para obter ticket por ID ---
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tickets WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'Ticket Not Found.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching ticket by ID:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

// --- Rota para obter informações do ticket por qrCodeId para impressão (e gerar PDF) ---
router.get('/:qrCodeId/printTicket', async (req, res) => {
  try {
    const qrCodeId = req.params.qrCodeId;

    if (!qrCodeId) {
      // Usar httpStatus.BAD_REQUEST para entrada inválida
      return res.status(httpStatus.BAD_REQUEST).json({ message: 'Informe o QR Code do ticket.' });
    }

    const ticket = await getTicketByQrCodeId(qrCodeId);
    if (!ticket) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'Ticket Not Found.' });
    }

    // Configuração para usar função serverless (pode ser configurado via variável de ambiente também)
    const USE_SERVERLESS_FUNCTION = process.env.USE_SERVERLESS_PDF_GENERATOR === 'true'; // Exemplo de como usar uma env var para isso

    let ticketPdf;

    if (USE_SERVERLESS_FUNCTION) {
      console.log('Using serverless function to generate PDF');

      // 1. Verificar se a variável de ambiente está definida ANTES de fazer a requisição
      const pdfServerlessUrl = process.env.GENERATE_PDF_SERVERLESS_URL;

      console.log('PDF Serverless URL configured:', pdfServerlessUrl); // Log para depuração

      if (!pdfServerlessUrl) {
        console.error('Erro: A variável de ambiente GENERATE_PDF_SERVERLESS_URL não está definida.');
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Erro de configuração do serviço de PDF. Entre em contato com o suporte.',
        });
      }

      // 2. Fazer a requisição para a função serverless
      const response = await fetch(pdfServerlessUrl, {
        method: 'POST',
        body: JSON.stringify(ticket), // Envia os dados do ticket para a função serverless
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 3. Tratar a resposta da função serverless
      if (!response.ok) {
        // Tentar obter detalhes do erro da resposta da função serverless
        const errorDetails = await response.text();
        console.error(`Erro ao gerar PDF na função serverless: ${response.status} - ${response.statusText}. Detalhes: ${errorDetails}`);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
          message: `Falha ao gerar PDF. Erro no serviço externo: ${response.status} - ${response.statusText}`,
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      ticketPdf = Buffer.from(arrayBuffer); // Converte ArrayBuffer para Buffer do Node.js
    } else {
      console.log('Using local service to generate PDF');
      ticketPdf = await ticketsServices.generateTicketPdf(ticket); // Sua função local
    }

    // Enviar o PDF como resposta
    res.contentType('application/pdf');
    res.send(ticketPdf);
  } catch (error) {
    console.error('Error in printTicket route:', error);
    // Erro genérico do servidor, pois o tratamento específico já foi feito acima
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

// --- Rota para compra de tickets ---
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
        .json({ message: 'Informe o associado responsável pela compra.' });
    }

    const [users] = await db.query('SELECT id, user_type FROM users WHERE id = ?', [
      req.body.associateId,
    ]);
    if (users.length === 0 || users[0].user_type !== 'associate') {
      console.error('Invalid "associateId" or user is not an associate.');
      return res
        .status(httpStatus.FORBIDDEN)
        .json({ message: 'Associado inválido ou usuário não é um associado.' });
    }

    if (!req.body.tickets || !Array.isArray(req.body.tickets) || req.body.tickets.length === 0) {
      console.error('"tickets" must be an array with at least one ticket.');
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: 'Informe a lista de tickets para compra.' });
    }

    const tickets = req.body.tickets;
    const associateId = req.body.associateId;
    
    const listOfTicketsToInsert = [];
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (!ticket.ticketTypeId) {
        console.error('Each ticket must have a "ticketTypeId".');
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: 'Informe o tipo de ticket para cada ticket.' });
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

    // Usando uma transação para garantir a atomicidade da compra de múltiplos tickets
    await db.query('START TRANSACTION');
    try {
      await db.query(
        'INSERT INTO tickets (associate_id, ticket_type_id, qr_code_id, status) VALUES ?',
        [listOfTicketsToInsert]
      );
      await db.query('COMMIT');
    } catch (transactionError) {
      await db.query('ROLLBACK'); // Desfaz a transação em caso de erro
      console.error('Transaction error during ticket purchase:', transactionError);
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: 'Erro interno ao processar a compra dos tickets.' });
    }

    res.status(httpStatus.CREATED).json({ message: 'Tickets comprados com sucesso!' });
  } catch (error) {
    console.error('Error in ticket purchase route:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

// --- Rota para validar ticket por qrCodeId ---
router.get('/:qrCodeId/validateTicket', async (req, res) => {
  try {
    const qrCodeId = req.params.qrCodeId;
    if (!qrCodeId) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: 'Informe o QR Code do ticket.' });
    }

    // Um ticket já usado é considerado inválido
    const [rows] = await db.query(
      `SELECT (IF(t.status = 'used', 'invalid', 'valid')) AS isTicketValid
       FROM tickets t WHERE t.qr_code_id = ?`,
      [qrCodeId]
    );

    let isTicketValid;
    if (rows.length > 0) {
      isTicketValid = rows[0].isTicketValid === 'valid';
    } else {
      console.log(`Ticket com QR Code '${qrCodeId}' não encontrado.`);
      isTicketValid = false; // Se o ticket não existe, é inválido
    }

    res.json({ isTicketValid });
  } catch (error) {
    console.error('Error in validateTicket route:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

module.exports = router;