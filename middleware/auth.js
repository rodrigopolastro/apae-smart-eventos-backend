// backend/middleware/auth.js

const jwt = require('jsonwebtoken');
const httpStatus = require('../constants/httpStatusesCodes');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'apae-smart-eventos'; // Use a mesma chave!

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Espera "Bearer TOKEN"

    if (token == null) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Authentication token required.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // console.error("Token verification error:", err); // Para depuração
            // Token inválido (expirado, modificado, etc.)
            return res.status(httpStatus.FORBIDDEN).json({ message: 'Invalid or expired token.' });
        }
        req.user = user; // Anexa os dados do usuário do token à requisição (id, user_type, email)
        next();
    });
};

// Middleware para autorizar roles específicas
const authorizeRoles = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.user_type || !allowedRoles.includes(req.user.user_type)) {
            return res.status(httpStatus.FORBIDDEN).json({ message: 'Access denied: Insufficient permissions.' });
        }
        next();
    };
};

module.exports = { authenticateToken, authorizeRoles };