const express = require('express');
const cors = require('cors'); 

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const eventsRouter = require('./routes/events');
const ticketsRouter = require('./routes/tickets');

const app = express();

app.use(cors({
    origin: 'http://localhost:8081' 
}));

app.use(express.json()); 

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/events', eventsRouter);
app.use('/tickets', ticketsRouter);

// Importar middlewares de autenticação
const { authenticateToken, authorizeRoles } = require('./middleware/auth'); // Opcional, se você quiser usar globalmente
// Rotas públicas (não exigem autenticação)
app.use('/api/auth', authRouter); // Rota de login/signup

// Rotas protegidas (exigem autenticação)
// Você pode aplicar o middleware diretamente aqui ou nas rotas individuais
// Exemplo: se todas as rotas de tickets e users precisam de autenticação:
// app.use('/api/users', authenticateToken, authorizeRoles(['associate', 'admin']), usersRouter);
// app.use('/api/tickets', authenticateToken, authorizeRoles(['associate', 'admin']), ticketsRouter);

// Ou, como fizemos acima, aplicando diretamente na rota de compra de tickets.
// Para as rotas GET /users e GET /users/:id/tickets (no users.js), você também pode querer protegê-las
// Exemplo:
app.use('/api/users', authenticateToken, authorizeRoles(['associate', 'admin']), usersRouter); // Protege todas as rotas em users.js
app.use('/api/events', eventsRouter); // Eventos podem ser públicos
app.use('/api/tickets', ticketsRouter); // A rota /purchase já está protegida internamente no tickets.js

module.exports = app;