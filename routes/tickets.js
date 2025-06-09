// routes/tickets.js (APÓS AS SUGESTÕES)
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const httpStatus = require('../constants/httpStatusesCodes');
const uuid = require('uuid');
const ticketsServices = require('../services/tickets');
const { authenticateToken, authorizeRoles } = require('../middleware/auth'); // <<--- IMPORTANTE!

// ... (suas rotas GET existentes)

// Get ticket by id (Manter, mas considere proteger com autenticação se for dado sensível)
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

// get ticket info by qrCodeId for printing (Manter)
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


// purchase ticket - AGORA PROTEGIDA E COM TRANSAÇÃO
router.post('/purchase', authenticateToken, authorizeRoles(['associate', 'admin']), async (req, res) => {
    const { tickets } = req.body;
    const associateId = req.user.id; // <<< AQUI É A GRANDE MUDANÇA: PEGA DO TOKEN!

    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: 'Invalid request: "tickets" array is required.' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const purchasedTicketsDetails = [];

        for (const ticketData of tickets) {
            const { ticketTypeId } = ticketData;

            if (!ticketTypeId) {
                throw new Error('Each ticket must have a "ticketTypeId".');
            }

            // 1. Obter tipo de ingresso e BLOQUEAR para atualização (FOR UPDATE)
            const [ticketTypes] = await connection.query('SELECT * FROM event_ticket_types WHERE id = ? FOR UPDATE', [ticketTypeId]);
            if (ticketTypes.length === 0) {
                throw new Error(`Ticket type with ID ${ticketTypeId} not found.`);
            }
            const ticketType = ticketTypes[0];

            // 2. Verificar estoque
            if (ticketType.quantity <= 0) {
                throw new Error(`Ticket type "${ticketType.name}" is out of stock.`);
            }

            // 3. Criar o ingresso na tabela purchased_tickets (ou 'tickets' se for a mesma tabela)
            const ticketQrCodeUuid = uuid.v4(); // Gerar QR code para cada ticket individualmente
            const ticketStatus = 'not used';

            const [insertResult] = await connection.query(
                // Ajuste o nome da sua tabela de tickets se for diferente de 'tickets'
                'INSERT INTO tickets (associate_id, ticket_type_id, qr_code_id, status, purchased_at) VALUES (?, ?, ?, ?, NOW())',
                [associateId, ticketTypeId, ticketQrCodeUuid, ticketStatus]
            );

            // 4. Diminuir o estoque na tabela event_ticket_types
            await connection.query(
                'UPDATE event_ticket_types SET quantity = quantity - 1 WHERE id = ?',
                [ticketTypeId]
            );

            purchasedTicketsDetails.push({
                purchaseId: insertResult.insertId, // O ID do ticket recém-criado
                ticketTypeId: ticketType.id,
                ticketTypeName: ticketType.name,
                price: ticketType.price,
                qrCode: ticketQrCodeUuid // Retornar o QR code para o cliente, se necessário
            });
        }

        await connection.commit();
        res.status(httpStatus.CREATED).json({
            message: 'Tickets purchased successfully!',
            purchasedTickets: purchasedTicketsDetails
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error during ticket purchase:', error);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: error.message || 'Failed to purchase tickets. Please try again.'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


// validate ticket (Manter, mas considere proteger com autenticação para funcionários ou admins)
router.get('/:qrCodeId/validateTicket', async (req, res) => {
    try {
        if (!req.params.qrCodeId) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: 'Inform the ticket QR Code' });
        }

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