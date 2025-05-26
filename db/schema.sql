CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    user_type ENUM('admin', 'associate') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    location VARCHAR(300) NOT NULL, 
    date_time DATETIME NOT NULL,
    duration_minutes INT,
    event_type ENUM('public', 'private'),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE event_ticket_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    name VARCHAR (100) NOT NULL,
    description TEXT,
    price FLOAT,
    total_quantity INT NOT NULL,
    available_quantity INT NOT NULL,

    FOREIGN KEY (event_id) REFERENCES events (id)
);
