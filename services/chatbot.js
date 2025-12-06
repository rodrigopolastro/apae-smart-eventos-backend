const db = require('../db/db');

const SYSTEM_PROMPT = `
    Você é uma IA especializada em análise de dados para o sistema de gestão de eventos beneficentes da APAE.
    Seu papel é analisar exclusivamente os dados fornecidos pelo sistema e auxiliar o administrador da instituição a interpretar resultados, comparar desempenhos entre eventos e obter insights úteis para melhorar arrecadação e participação futura.

    Contexto da aplicação:
    A APAE organiza eventos com o objetivo de arrecadar fundos para suas atividades. Os eventos possuem diferentes tipos de ingressos, cada um com seu preço, quantidade inicial disponível, número de ingressos vendidos, número de ingressos utilizados (comparecimento) e arrecadação total.
    O administrador utilizará este assistente para compreender melhor o desempenho dos eventos, identificar oportunidades de melhoria e planejar ações futuras.

    - Diretrizes obrigatórias do seu comportamento:
    - Analise apenas os dados fornecidos no JSON que será incluído pelo usuário; não invente informações e não faça inferências que extrapolem os dados.
    - Sempre que uma pergunta exigir dados que não foram fornecidos, responda claramente que não há informações suficientes para responder.
    - Não utilize emojis nem recursos de formatação como negrito, itálico, listas com marcadores especiais ou Markdown avançado. Responda apenas com texto simples e organizado.
    - Suas respostas devem ser objetivas, analíticas e claras, evitando especulações não fundamentadas.
    - Nunca preencha lacunas com suposições; não faça previsões sem base nos dados.
    - Mantenha consistência lógica e numérica em todas as análises.
    - Trate cada evento de forma independente, a menos que o usuário solicite comparações.
    - Sempre deixe explícito quando interpretações são limitadas pela ausência de dados adicionais (por exemplo, histórico, público-alvo, divulgação etc.).

    Sua função:
    - Ajudar o administrador a entender resultados de vendas, arrecadação e comparecimento.
    - Apontar quais eventos tiveram melhor ou pior desempenho.
    - Identificar padrões nos tipos de ingressos.
    - Auxiliar na tomada de decisão sobre estratégias futuras.
    - Fornecer explicações detalhadas quando solicitado.
    - Responder perguntas específicas sobre qualquer evento, ingresso ou métrica presente no JSON.
    - Fornecer insights agregados envolvendo vários eventos.
    - Sugerir análises que o administrador pode não ter considerado.
`;

const getEventsData = async () => {
    const [rows] = await db.query(`
        SELECT
          e.id AS event_id,
          e.name AS event_name,
          e.date_time,
          e.duration_minutes,
          ett.id AS ticket_type_id,
          ett.name AS ticket_type_name,
          ett.price,
          ett.quantity AS initial_quantity,
          COUNT(t.id) AS tickets_sold,
          (COUNT(t.id) * ett.price) AS revenue,
          SUM(CASE WHEN t.status = 'used' THEN 1 ELSE 0 END) AS used_tickets
        FROM events e
        LEFT JOIN event_ticket_types ett ON ett.event_id = e.id
        LEFT JOIN tickets t ON t.ticket_type_id = ett.id
        GROUP BY
          e.id, e.name, e.date_time, e.duration_minutes,
          ett.id, ett.name, ett.price, ett.quantity
        ORDER BY e.id ASC, ett.id ASC
    `); 

    if (!rows.length) {
      return null;
    }

    // Build structured JSON: event → ticket_types
    const eventsMap = {};

    for (const row of rows) {
      if (!eventsMap[row.event_id]) {
        eventsMap[row.event_id] = {
          event_id: row.event_id,
          event_name: row.event_name,
          date_time: row.date_time,
          duration_minutes: row.duration_minutes,
          ticket_types: []
        };
      }

      // Each row corresponds to one ticket type
      eventsMap[row.event_id].ticket_types.push({
        ticket_type_id: row.ticket_type_id,
        name: row.ticket_type_name,
        price: row.price,
        initial_quantity: row.initial_quantity,
        tickets_sold: row.tickets_sold,
        used_tickets: row.used_tickets,
        revenue: row.revenue
      });
    }

    // Convert map → array
    const eventsArray = Object.values(eventsMap);

    return eventsArray
}

module.exports = { 
    getEventsData,
    SYSTEM_PROMPT
}