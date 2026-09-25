const { rateLimit } = require('express-rate-limit');

// LOGIN
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos de inicio de sesion. Intenta nuevamente en 15 minutos.'
  }
});

// REGISTRO Y VERIFICACION
const registroLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos. Intenta nuevamente en 15 minutos.'
  }
});

// RECUPERACION DE CONTRASENA
const recuperarLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos de recuperacion. Intenta nuevamente en 15 minutos.'
  }
});

module.exports = {
  loginLimiter,
  registroLimiter,
  recuperarLimiter
};