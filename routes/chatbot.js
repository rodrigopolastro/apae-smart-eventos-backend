const express = require('express');
const router = express.Router();
const httpStatus = require('../constants/httpStatusesCodes');
const { getEventsData, SYSTEM_PROMPT } = require('../services/chatbot');

router.get('/generateSuggestions', async (req, res) => {
  try {
    const eventsData = await getEventsData();
    const dataStr = `Este é o JSON com o qual você trabalhará: ${JSON.stringify(eventsData)}.`
    const suggestionsPrompt = `Com base nestes dados, sugira três perguntas para o administrador 
    que irão dar insights valiosos para ele e que você pode responder com base nos dados fornecidos
    As perguntas devem ser curtas e simples, contendo apenas um foco por pergunta. Evite perguntas longas, 
    múltiplas em uma só ou que misturem várias análises.`;
    const prompt = `${SYSTEM_PROMPT}. ${dataStr}, ${suggestionsPrompt}`;

    res.json(prompt);
  } catch (error) {
    console.error(error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

module.exports = router;