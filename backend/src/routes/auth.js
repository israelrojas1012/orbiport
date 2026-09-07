const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { enviarEmail } = require('../email');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const tokensVerificacion = {};

// REGISTRO
router.post('/registro', async (req, res) => {
  const { nombre, apellido, correo, contrasena, acepto_terminos } = req.body;

  const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!correoRegex.test(correo)) {
    return res.status(400).json({ error: 'Correo no valido' });
  }

  const contrasenaRegex = /^(?=.*[a-zA-Z])(?=.*[0-9]).{6,}$/;
  if (!contrasenaRegex.test(contrasena)) {
    return res.status(400).json({ error: 'La contrasena debe tener letras y numeros, minimo 6 caracteres' });
  }

  if (!acepto_terminos) {
    return res.status(400).json({ error: 'Debes aceptar los terminos y condiciones para registrarte' });
  }

  try {
    const existe = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [correo]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'El correo ya esta registrado' });
    }

    const hash = await bcrypt.hash(contrasena, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, apellido, correo, contrasena, verificado, acepto_terminos, fecha_acepto_terminos) 
       VALUES ($1, $2, $3, $4, false, true, NOW()) 
       RETURNING id, nombre, correo`,
      [nombre, apellido, correo, hash]
    );

    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    tokensVerificacion[correo] = { token, expira: Date.now() + 30 * 60 * 1000 };

    await enviarEmail(
      correo,
      'Verifica tu cuenta - Orbiport',
      `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5;">Bienvenido a Orbiport, ${nombre}!</h2>
          <p>Gracias por registrarte. Tu codigo de verificacion es:</p>
          <div style="background: #f0f0ff; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4f46e5; letter-spacing: 8px; font-size: 36px;">${token}</h1>
          </div>
          <p style="color: #999; font-size: 13px;">Este codigo expira en 30 minutos.</p>
        </div>
      `
    );

    res.status(201).json({ mensaje: 'Cuenta creada. Revisa tu correo para verificarla.', usuario: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// VERIFICAR CORREO
router.post('/verificar', async (req, res) => {
  const { correo, token } = req.body;
  try {
    const registro = tokensVerificacion[correo];
    if (!registro) return res.status(400).json({ error: 'No hay solicitud activa para este correo' });
    if (registro.token !== token.toUpperCase()) return res.status(400).json({ error: 'Codigo incorrecto' });
    if (Date.now() > registro.expira) return res.status(400).json({ error: 'El codigo ha expirado' });
    await pool.query('UPDATE usuarios SET verificado = true WHERE correo = $1', [correo]);
    delete tokensVerificacion[correo];
    res.json({ mensaje: 'Correo verificado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al verificar' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { correo, contrasena } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Correo o contrasena incorrectos' });
    }
    const usuario = result.rows[0];
    const valido = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!valido) {
      return res.status(400).json({ error: 'Correo o contrasena incorrectos' });
    }
    if (!usuario.verificado) {
      return res.status(400).json({ error: 'Debes verificar tu correo antes de iniciar sesion', sinVerificar: true, correo });
    }
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        rol: usuario.rol,
        acepto_terminos: usuario.acepto_terminos
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;
