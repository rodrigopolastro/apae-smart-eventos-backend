const express = require('express');
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const eventsRouter = require('./routes/events');
const ticketsRouter = require('./routes/tickets');

const app = express();

app.use(express.json());
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/events', eventsRouter);
app.use('/tickets', ticketsRouter);

module.exports = app;
