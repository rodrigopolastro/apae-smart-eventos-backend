/*// k6-tests/public_events_flow.js
// Script de Teste de Carga, Estresse e Performance (Fluxo Publico)
// URL Base da API: http://35.169.57.51:3000

import http from 'k6/http';
import { check, group, sleep } from 'k6';

// -----------------------------------------------------------------------------------
// 1. CONFIGURAÇÃO BASE (URL da sua API)
// -----------------------------------------------------------------------------------
const BASE_URL = 'http://35.169.57.51:3000'; 
const API_PREFIX = ''; 

// Configurações de performance e falha (Thresholds)
export const options = {
    // Definicoes de tempo/falha que, se violadas, reprovam o teste.
    thresholds: {
        // 95% das requisicoes devem ter tempo de resposta menor que 800ms
        http_req_duration: ['p(95)<800'], 
        // A taxa de falha (erros HTTP 4xx/5xx) deve ser inferior a 1%
        http_req_failed: ['rate<0.01'], 
    },
    
    // *** CONFIGURAÇÃO DE CARGA (LOAD TEST) AGORA ESTÁ AQUI ***
    stages: [
        { duration: '1m', target: 15 },  // Rampa de 0 a 15 VUs em 1 minuto
        { duration: '3m', target: 15 },  // Mantém 15 VUs por 3 minutos
        { duration: '1m', target: 0 },   // Reduz a carga para 0 em 1 minuto
    ],
    // Vus total de 15, com duracao de 5 minutos
    // *** FIM DA CONFIGURAÇÃO DE CARGA ***
};


// -----------------------------------------------------------------------------------
// 2. FLUXO DE USUÁRIO (Visualizacao de Eventos)
// -----------------------------------------------------------------------------------
export default function () {
    let eventId = null; 

    // GRUPO 1: VISUALIZAÇÃO DA LISTA DE EVENTOS (GET /events)
    group('01. GET /events (Lista de Eventos)', () => {
        const eventsListRes = http.get(`${BASE_URL}${API_PREFIX}/events`); 
        
        // Check 1: Verifica se a requisicao retornou 200 OK
        check(eventsListRes, {
            'Status 200 - Lista de Eventos OK': (r) => r.status === 200,
        });
        
        // CORREÇÃO: Usa 'json()' para analisar o corpo da resposta.
        try {
            const eventsData = eventsListRes.json();
            let events = [];

            // Lógica para extrair o array de eventos, seja ele na raiz ou em 'data'/'eventos'
            if (eventsData && Array.isArray(eventsData)) {
                events = eventsData;
            } else if (eventsData && eventsData.eventos && Array.isArray(eventsData.eventos)) {
                 events = eventsData.eventos;
            } else if (eventsData && eventsData.data && Array.isArray(eventsData.data)) {
                 events = eventsData.data;
            }
            
            check(eventsListRes, {
                // Agora, verificamos se o array que extraímos nao esta vazio
                'Lista nao vazia e eh um JSON array': (r) => Array.isArray(events) && events.length > 0,
            });

            // Se for um array nao vazio, extrai um ID aleatorio para o proximo grupo
            if (Array.isArray(events) && events.length > 0) {
                const randomIndex = Math.floor(Math.random() * events.length);
                eventId = events[randomIndex].id; 
            }
        } catch (e) {
             // Imprime o erro de parse para ajudar a depurar se o JSON estiver mal formado
             console.error(`Falha ao analisar JSON ou extrair eventos: ${e.message}`);
        }

        sleep(1); 
    });


    // GRUPO 2: VISUALIZAÇÃO DO DETALHE DO EVENTO (GET /events/:id)
    if (eventId) {
        group('02. GET /events/:id (Detalhe do Evento)', () => {
            
            // Requisita os detalhes do evento usando o ID que acabamos de obter
            const eventDetailRes = http.get(`${BASE_URL}${API_PREFIX}/events/${eventId}`); 

            check(eventDetailRes, {
                'Status 200 - Detalhe do Evento OK': (r) => r.status === 200,
                // O Detalhe do evento deve ser um objeto, e nao um array.
                'Detalhe do Evento contem titulo': (r) => r.json() && typeof r.json() === 'object' && r.json().name != undefined,
            });

            sleep(3); 
        });
    }
}
