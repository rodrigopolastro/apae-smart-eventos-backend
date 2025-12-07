const express = require('express');
const cors = require('cors');

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const eventsRouter = require('./routes/events');
const ticketsRouter = require('./routes/tickets');
const paymentsRouter = require('./routes/payments');

const app = express();

app.use(
  cors({
    origin: '*',
  })
);

app.use(express.json());

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/events', eventsRouter);
app.use('/tickets', ticketsRouter);
app.use('/payments', paymentsRouter);

module.exports = app;
