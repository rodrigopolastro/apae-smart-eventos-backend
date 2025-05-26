-- cria usuário admin e 3 associados
INSERT INTO users (email, password, name, user_type) VALUES
('admin@gmail.com', '123', 'ADMIN', 'admin'),
('associado1@gmail.com', '123', 'Leonardo', 'associate'),
('associado2@gmail.com', '123', 'Tamara', 'associate'),
('associado3@gmail.com', '123', 'Bruno', 'associate');

-- cria um evento de exemplo
INSERT INTO events(
    name, 
    description, 
    location, 
    date_time, 
    duration_minutes, 
    event_type
) VALUES 
    (
        'Visita à FATEC Itapira', 
        'Visita técnica na faculdade para conhecer os alunos',
        'FATEC "Ogari de Castro Pacheco" - Itapira',
        '2025-05-31 09:00:00',
        60,
        'public'
    );

-- cria os tipos de ingressos para o evento de exemplo
INSERT INTO event_ticket_types (
    event_id,
    name,
    description,
    price,
    total_quantity,
    available_quantity
) VALUES 
    (
        1,
        'Padrão'
        'Ingresso padrão',
        50.00,
        10,
        10
    ),
    (
        1,
        'Meia-Entrada'
        'Meia-Entrada para crianças de até 12 anos e estudantes',
        25.00,
        10,
        10
    ),
    (
        1,
        'VIP'
        'Ingresso VIP com benefícios exclusivos',
        100.00,
        5,
        5
    );

-- cadastra ingressos comprados para o evento de exemplo
INSERT INTO tickets (
    ticket_type_id,
    associate_id,
    status,
    used_at,
) VALUES 
    (
        1,
        2,
        'used',
        '2025-05-31 09:50:00'
    ),
    (
        2,
        1,
        'used',
        '2025-05-31 09:51:00'
    ),
    (
        3,
        2,
        'not used',
        NULL
    );