const express = require('express');
const cors = require('cors'); 

const indexRouter = require('./routes/index');
const authRouter = require('express').Router(); 
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

module.exports = app;