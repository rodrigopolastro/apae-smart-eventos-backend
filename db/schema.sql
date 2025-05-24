CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    user_type ENUM('admin', 'associate') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);