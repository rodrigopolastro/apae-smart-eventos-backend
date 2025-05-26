INSERT INTO users (email, password, name, user_type) VALUES
('admin@gmail.com', '123', 'ADMIN', 'admin'),
('associado1@gmail.com', '123', 'Leonardo', 'associate'),
('associado2@gmail.com', '123', 'Tamara', 'associate'),
('associado3@gmail.com', '123', 'Bruno', 'associate');

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

