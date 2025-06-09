// routes/events.js
const express = require('express');
const router = express.Router();
const db = require('../db/db'); // Seu módulo de conexão com o banco de dados
const httpStatus = require('../constants/httpStatusesCodes'); // Seus códigos de status HTTP

// Rota para buscar detalhes de um evento específico
// GET /events/:eventId
router.get('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    // Adapte sua consulta SQL para buscar os detalhes do evento
    // Certifique-se de que sua tabela 'events' tenha as colunas 'title', 'description', 'location', 'date', 'image_url', etc.
    const [rows] = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);

    if (rows.length === 0) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'Evento não encontrado.' });
    }

    const event = rows[0];

    // Opcional: Se você tiver detalhes administrativos (ticketsAvailable, ticketsSold, etc.)
    // em outras tabelas ou precisa calculá-los, adicione a lógica aqui.
    // Por simplicidade, estou retornando o que veio do banco.
    // Você pode querer fazer um JOIN ou várias consultas para agregar esses dados.
    // Exemplo de como você poderia adicionar dados de tickets (se em outra tabela)
    const [ticketStats] = await db.query(
      `SELECT
         SUM(CASE WHEN type = 'vip' THEN stock ELSE 0 END) as vip_stock,
         SUM(CASE WHEN type = 'normal' THEN stock ELSE 0 END) as normal_stock,
         SUM(CASE WHEN type = 'meia' THEN stock ELSE 0 END) as meia_stock
       FROM tickets_types WHERE event_id = ?`,
      [eventId]
    );

    const [ticketsSoldResult] = await db.query(
      `SELECT COUNT(*) as total_sold FROM user_tickets WHERE event_id = ? AND status = 'sold'`,
      [eventId]
    );
    const ticketsSold = ticketsSoldResult[0].total_sold;

    // Se tiver diferentes tipos de ingresso com seus próprios estoques e preços
    const [ticketTypes] = await db.query('SELECT type, price, stock FROM tickets_types WHERE event_id = ?', [eventId]);
    const formattedTicketTypes = ticketTypes.reduce((acc, current) => {
        acc[current.type] = { count: current.stock, price: current.price }; // stock como count inicial para modal
        return acc;
    }, {});


    res.json({
      id: event.id,
      image: event.image_url, // Assumindo que você salva a URL da imagem no BD
      title: event.title,
      date: event.date, // Você pode formatar isso no frontend
      location: event.location,
      description: event.description,
      fullDate: event.full_date, // Assumindo que você tem uma coluna para isso ou formata no frontend
      // Dados administrativos - ajuste para como você os buscará
      adminDetails: {
        ticketsAvailable: event.total_tickets || 0, // Exemplo
        ticketsSold: ticketsSold,
        attendees: 0, // Precisa de lógica para contar presenças confirmadas
        ticketPrice: event.default_ticket_price || 0, // Se houver um preço padrão
        revenue: 0 // Precisa de lógica para calcular arrecadação
      },
      // Dados de tipos de ingresso para a compra
      ticketTypes: formattedTicketTypes // Envie os tipos de ingresso e seus preços do backend
    });

  } catch (error) {
    console.error('Erro ao buscar detalhes do evento:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Erro interno do servidor ao buscar evento.' });
  }
});

// b) Rota para registrar a compra de ingressos (POST):
// POST /events/:eventId/purchase
router.post('/:eventId/purchase', async (req, res) => {
    try {
        const { eventId } = req.params;
        // Espera receber um objeto no body como:
        // {
        //   "tickets": {
        //     "vip": 1,
        //     "normal": 2,
        //     "meia": 0
        //   }
        // }
        const { tickets } = req.body;
        // O user_id viria do token JWT do usuário logado
        const userId = req.user.id; // Supondo que você tem um middleware de autenticação que popula req.user

        if (!tickets || Object.keys(tickets).length === 0) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: 'Nenhum ingresso selecionado para compra.' });
        }

        // 1. Verificar disponibilidade dos ingressos e preços
        const [availableTickets] = await db.query('SELECT type, price, stock FROM tickets_types WHERE event_id = ?', [eventId]);
        const availableMap = availableTickets.reduce((acc, t) => {
            acc[t.type] = { price: t.price, stock: t.stock };
            return acc;
        }, {});

        let totalAmount = 0;
        const purchaseItems = [];

        for (const type in tickets) {
            const quantity = tickets[type];
            if (quantity > 0) {
                if (!availableMap[type]) {
                    return res.status(httpStatus.BAD_REQUEST).json({ message: `Tipo de ingresso '${type}' inválido.` });
                }
                if (availableMap[type].stock < quantity) {
                    return res.status(httpStatus.BAD_REQUEST).json({ message: `Estoque insuficiente para ingresso ${type}. Disponível: ${availableMap[type].stock}` });
                }
                totalAmount += quantity * availableMap[type].price;
                purchaseItems.push({ type, quantity, price: availableMap[type].price });
            }
        }

        if (purchaseItems.length === 0) {
             return res.status(httpStatus.BAD_REQUEST).json({ message: 'Nenhum ingresso selecionado para compra.' });
        }

        // 2. Iniciar transação (para garantir atomicidade)
        await db.beginTransaction();

        // 3. Registrar a compra (ex: em uma tabela 'purchases')
        const [purchaseResult] = await db.execute(
            'INSERT INTO purchases (user_id, event_id, total_amount, purchase_date, status) VALUES (?, ?, ?, NOW(), ?)',
            [userId, eventId, totalAmount, 'pending'] // Ou 'completed' se o pagamento for instantâneo
        );
        const purchaseId = purchaseResult.insertId;

        // 4. Registrar os ingressos individuais e atualizar o estoque
        for (const item of purchaseItems) {
            // Inserir cada ingresso comprado na tabela 'user_tickets'
            for (let i = 0; i < item.quantity; i++) {
                // Gerar um código de ticket único (pode ser um UUID ou hash)
                const ticketCode = generateUniqueTicketCode(); // Implemente esta função
                await db.execute(
                    'INSERT INTO user_tickets (user_id, event_id, purchase_id, ticket_type, price_paid, ticket_code, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [userId, eventId, purchaseId, item.type, item.price, ticketCode, 'valid']
                );
            }
            // Atualizar o estoque na tabela 'tickets_types'
            await db.execute(
                'UPDATE tickets_types SET stock = stock - ? WHERE event_id = ? AND type = ?',
                [item.quantity, eventId, item.type]
            );
        }

        await db.commit(); // Confirmar a transação

        res.status(httpStatus.CREATED).json({
            message: 'Compra de ingressos realizada com sucesso!',
            purchaseId: purchaseId,
            totalAmount: totalAmount,
            ticketsPurchased: purchaseItems,
            // Opcional: retornar os códigos dos ingressos gerados
        });

    } catch (error) {
        await db.rollback(); // Desfazer a transação em caso de erro
        console.error('Erro ao processar compra de ingressos:', error);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Erro interno do servidor ao processar compra.' });
    }
});

// Função de exemplo para gerar código único (implemente algo robusto)
function generateUniqueTicketCode() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

module.exports = router;