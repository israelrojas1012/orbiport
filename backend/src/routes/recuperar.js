const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { enviarEmail } = require('../email');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Almacena tokens temporales en memoria
const tokens = {};

// SOLICITAR RECUPERACION
router.post('/solicitar', async (req, res) => {
  try {
    const { correo } = req.body;
    const result = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No existe una cuenta con ese correo' });
    }
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    tokens[correo] = { token, expira: Date.now() + 15 * 60 * 1000 };
    await enviarEmail(
      correo,
      'Recuperacion de contrasena - Orbiport',
      `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5;">Orbiport</h2>
          <p>Recibimos una solicitud para restablecer tu contrasena.</p>
          <p>Tu codigo de verificacion es:</p>
          <div style="background: #f0f0ff; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4f46e5; letter-spacing: 8px; font-size: 36px;">${token}</h1>
          </div>
          <p style="color: #999; font-size: 13px;">Este codigo expira en 15 minutos. Si no solicitaste esto, ignora este correo.</p>
        </div>
      `
    );
    res.json({ mensaje: 'Codigo enviado al correo' });
  } catch (err) {
    res.status(500).json({ error: 'Error al enviar el correo' });
  }
});

// VERIFICAR TOKEN Y CAMBIAR CONTRASENA
router.post('/cambiar', async (req, res) => {
  try {
    const { correo, token, nueva } = req.body;
    const registro = tokens[correo];
    if (!registro) return res.status(400).json({ error: 'No hay solicitud activa para este correo' });
    if (registro.token !== token.toUpperCase()) return res.status(400).json({ error: 'Codigo incorrecto' });
    if (Date.now() > registro.expira) return res.status(400).json({ error: 'El codigo ha expirado' });
    const hash = await bcrypt.hash(nueva, 10);
    await pool.query('UPDATE usuarios SET contrasena = $1 WHERE correo = $2', [hash, correo]);
    delete tokens[correo];
    res.json({ mensaje: 'Contrasena actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar contrasena' });
  }
});

module.exports = router;
