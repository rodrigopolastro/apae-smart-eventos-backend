const express = require('express');
const router = express.Router();
const httpStatus = require('../constants/httpStatusesCodes');
const { getEventsData, SYSTEM_PROMPT, askChatbot } = require('../services/chatbot');

router.get('/getQuestionSuggestions', async (req, res) => {
  try {
    const eventsData = await getEventsData();
    const dataStr = `Este é o JSON com o qual você trabalhará: ${JSON.stringify(eventsData)}.`
    const suggestionsPrompt = `Com base nestes dados, sugira exatamente três perguntas para o administrador 
    que irão dar insights valiosos para ele e que você pode responder com base nos dados fornecidos
    As perguntas devem ser curtas e simples, contendo apenas um foco por pergunta. Evite perguntas longas, 
    múltiplas em uma só ou que misturem várias análises.
    
    A sua resposta deve ser um json exatamente nesse formato e nada mais: 
    { 
        "suggestion1": "...", 
        "suggestion2": "...", 
        "suggestion3": "..."
    }
    `;
    const prompt = `${SYSTEM_PROMPT}. ${dataStr}, ${suggestionsPrompt}`;

    const responseSchema = {
        type: "object",
        properties: {
            suggestion1: { type: "string" },
            suggestion2: { type: "string" },
            suggestion3: { type: "string" }
        },
        required: ["suggestion1", "suggestion2", "suggestion3"]
    };
    const { suggestion1, suggestion2, suggestion3 } = await askChatbot(prompt, responseSchema);

    res.json({ suggestion1, suggestion2, suggestion3 });
  } catch (error) {
    console.error(error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

router.post('/askQuestion', async (req, res) => {
  try {
    const question = req.body.question;
    if (!question) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: 'You must inform the question to be answered' });
    }
    const eventsData = await getEventsData();
    const dataStr = `Este é o JSON com o qual você trabalhará: ${JSON.stringify(eventsData)}.`
    const questionPrompt = `Com base nesses dados e levando em conta as instruções fornecidas 
     responda à seguinte pergunta: "${question}"`;
    const prompt = `${SYSTEM_PROMPT}. ${dataStr}, ${questionPrompt}`;
    const answer = await askChatbot(prompt);

    res.json({ answer: answer });
  } catch (error) {
    console.error(error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

module.exports = router;