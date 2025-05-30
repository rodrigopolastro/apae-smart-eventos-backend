const express = require('express');
const router = express.Router();
const db = require('../db/db');
const httpStatus = require('../constants/httpStatusesCodes');

// Get all users
router.get('/', async (req, res) => {
  const [users] = await db.query('SELECT * FROM users');
  res.json(users);
});

// Get user by id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      res.status(httpStatus.NOT_FOUND).json({ message: 'User Not Found.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

// Criar um novo usuário (Adicionado)
router.post('/', async (req, res) => {
  try {
    const { email, password, name} = req.body; // Supondo que você receberá esses dados
    // TODO: Adicionar validação dos dados recebidos
    // TODO: Adicionar hash da senha antes de salvar no banco de dados (MUITO IMPORTANTE PARA SEGURANÇA)

    if (!email || !password || !name ) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: 'All fields are required: name, email, password.' });
    }

    // Exemplo de inserção, ajuste para a estrutura real da sua tabela de usuários
    const [result] = await db.query(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email, password, name] // Lembre-se de fazer hash da senha antes de passar aqui!
    );

    // Retorna o ID do novo usuário ou a mensagem de sucesso
    res.status(httpStatus.CREATED).json({ message: 'User created successfully', userId: result.insertId });

  } catch (error) {
    console.error('Error creating user:', error);
    // Verificar se é um erro de duplicidade de e-mail, por exemplo
    if (error.code === 'ER_DUP_ENTRY') { // Código de erro MySQL para entrada duplicada
        return res.status(httpStatus.CONFLICT).json({ message: 'Email already registered.' });
    }
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error.' });
  }
});

module.exports = router;