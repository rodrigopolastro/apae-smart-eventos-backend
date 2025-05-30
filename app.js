const express = require('express');
const cors = require('cors'); // Adicionar esta linha
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const eventsRouter = require('./routes/events');
const ticketsRouter = require('./routes/tickets');

const app = express();

// Configuração do CORS - ANTES de qualquer rota
app.use(cors());

// Middlewares
app.use(express.json());

// Rotas
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter); // Testar primeiro só esta


app.use('/events', eventsRouter);
app.use('/tickets', ticketsRouter);

module.exports = app;

module.exports = app;