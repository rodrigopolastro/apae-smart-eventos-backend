// backend/routes/auth.js

const express = require('express');
const router = express.Router();
const db = require('../db/db');
const httpStatus = require('../constants/httpStatusesCodes'); // Certifique-se que este arquivo existe
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Importar bcryptjs (ou bcrypt)
require('dotenv').config();

// Defina sua chave secreta JWT, idealmente em uma variável de ambiente
const JWT_SECRET = process.env.JWT_SECRET || 'apae-smart-eventos'; // Altere isso para uma chave forte e secreta!

// Rota de Registro (SignUp)
router.post('/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: 'Bad Request: Missing name, email, or password.' });
        }

        const [rows] = await db.query('SELECT 1 FROM users WHERE email = ?', [email]);
        if (rows.length > 0) {
            return res.status(httpStatus.CONFLICT).json({ message: 'This email is already in use.' });
        }

        // 1. Hash da senha antes de salvar
        const salt = await bcrypt.genSalt(10); // Gera um "sal"
        const hashedPassword = await bcrypt.hash(password, salt); // Gera o hash da senha

        const [result] = await db.execute(
            // Certifique-se de que sua coluna de senha no DB pode armazenar hashes longos (VARCHAR(255) é bom)
            'INSERT INTO users (email, password, name, user_type) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, name, 'associate'] // Salva a senha com hash
        );

        const user = {
            id: result.insertId,
            email: email, // Adicione o email ao payload do token se for útil
            user_type: 'associate', // 'type' no seu frontend é 'user_type' no backend
        };

        const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

        res.status(httpStatus.CREATED).json({
            message: 'User registered successfully!',
            user: { id: user.id, email: user.email, user_type: user.user_type }, // Retorne apenas dados seguros do usuário
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
});

// Rota de Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res
                .status(httpStatus.BAD_REQUEST)
                .json({ message: 'You must inform email and password.' });
        }

        // 1. Buscar usuário por email
        const [rows] = await db.query('SELECT id, email, password, user_type FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {
            // Não revele se o email não existe ou a senha está errada por motivos de segurança
            return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Invalid email or password.' });
        }

        const userFromDb = rows[0];

        // 2. Comparar a senha fornecida com o hash armazenado
        const isMatch = await bcrypt.compare(password, userFromDb.password);

        if (!isMatch) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Invalid email or password.' });
        }

        // Opcional: Você pode adicionar uma verificação de 'user_type' aqui se quiser
        // por exemplo, se apenas 'associates' podem logar por essa rota.
        if (userFromDb.user_type !== 'associate' && userFromDb.user_type !== 'admin') {
             return res.status(httpStatus.FORBIDDEN).json({ message: 'User is not authorized to login here.' });
        }


        const userPayload = { // Payload para o JWT
            id: userFromDb.id,
            email: userFromDb.email, // Adicione o email ao payload se for útil
            user_type: userFromDb.user_type,
        };

        const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Login successful',
            user: { id: userFromDb.id, email: userFromDb.email, user_type: userFromDb.user_type }, // Retorne apenas dados seguros
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
});

// Rota de Refresh Token (manter como está, mas garantir que usa JWT_SECRET)
router.post('/refresh', async (req, res) => {
    try {
        if (!req.body.refreshToken) {
            return res
                .status(httpStatus.BAD_REQUEST)
                .json({ message: 'You must send the refresh token.' });
        }

        jwt.verify(
            req.body.refreshToken,
            JWT_SECRET, // Usar a mesma chave secreta
            (error, decodedToken) => {
                if (error) {
                    return res.status(httpStatus.FORBIDDEN).json({ message: 'Invalid or expired refresh token.' });
                }

                const user = {
                    id: decodedToken.id,
                    user_type: decodedToken.user_type, // 'type' no token deve ser 'user_type'
                    email: decodedToken.email, // Inclua o email se estiver no payload
                };
                const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: '15m' });

                res.json({ accessToken });
            }
        );
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
});

module.exports = router;