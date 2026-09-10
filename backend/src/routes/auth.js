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
  ssl: { rejectUnauthorized: false }
});

// Limpieza automática de tokens expirados
const limpiarTokensExpirados = async () => {
  try {
    await pool.query(
      'DELETE FROM tokens_registro WHERE expira_en < NOW()'
    );
  } catch (err) {
    console.error('Error limpiando tokens:', err);
  }
};

// Ejecutar limpieza cada 30 minutos
setInterval(limpiarTokensExpirados, 30 * 60 * 1000);

// REGISTRO
router.post('/registro', async (req, res) => {
  const { nombre, apellido, correo, contrasena, acepto_terminos } = req.body;

  const correoNormalizado = correo?.trim().toLowerCase();

  const correoRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]{2,}(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
  if (!correoNormalizado || !correoRegex.test(correoNormalizado)) {
    return res.status(400).json({ error: 'Ingresa un correo electrónico válido' });
  }

  const contrasenaRegex = /^(?=.*[a-zA-Z])(?=.*[0-9]).{6,}$/;
  if (!contrasenaRegex.test(contrasena)) {
    return res.status(400).json({ error: 'La contraseña debe contener letras y números, un mínimo de 6 caracteres.' });
  }

  if (!acepto_terminos) {
    return res.status(400).json({ error: 'Debe aceptar los terminos y condiciones para registrarse' });
  }

  try {
    // Verificar si ya existe cuenta verificada
    const existe = await pool.query(
      'SELECT id FROM usuarios WHERE LOWER(correo) = $1',
      [correoNormalizado]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'El correo ya esta registrado' });
    }

    // Eliminar tokens anteriores del mismo correo
    await pool.query(
      'DELETE FROM tokens_registro WHERE correo = $1',
      [correoNormalizado]
    );

    const hash = await bcrypt.hash(contrasena, 10);

    const token = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    // Guardar token en base de datos
    await pool.query(
      `INSERT INTO tokens_registro 
        (correo, token, nombre, apellido, contrasena, expira_en)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '30 minutes')`,
      [correoNormalizado, token, nombre, apellido, hash]
    );

    await enviarEmail(
      correoNormalizado,
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

    res.status(201).json({
      mensaje: 'Codigo enviado. Revisa tu correo para verificar tu cuenta.'
    });

  } catch (err) {
    console.error(err);
    await pool.query(
      'DELETE FROM tokens_registro WHERE correo = $1',
      [correoNormalizado]
    );
    res.status(500).json({ error: 'No se pudo enviar el codigo de verificacion' });
  }
});

// VERIFICAR CORREO
router.post('/verificar', async (req, res) => {
  const { correo, token } = req.body;

  const correoNormalizado = correo?.trim().toLowerCase();
  const tokenNormalizado = token?.trim().toUpperCase();

  try {
    // Buscar token en base de datos
    const registroResult = await pool.query(
      'SELECT * FROM tokens_registro WHERE correo = $1 AND token = $2',
      [correoNormalizado, tokenNormalizado]
    );

    if (registroResult.rows.length === 0) {
      return res.status(400).json({ error: 'No hay solicitud activa para este correo o codigo incorrecto' });
    }

    const registro = registroResult.rows[0];

    // Verificar si el código expiró
    if (new Date() > new Date(registro.expira_en)) {
      await pool.query(
        'DELETE FROM tokens_registro WHERE correo = $1',
        [correoNormalizado]
      );
      return res.status(400).json({ error: 'El codigo ha expirado. Solicita uno nuevo' });
    }

    // Verificar que el correo no fue registrado mientras esperaba
    const existe = await pool.query(
      'SELECT id FROM usuarios WHERE LOWER(correo) = $1',
      [correoNormalizado]
    );

    if (existe.rows.length > 0) {
      await pool.query(
        'DELETE FROM tokens_registro WHERE correo = $1',
        [correoNormalizado]
      );
      return res.status(400).json({ error: 'El correo ya esta registrado' });
    }

    // Crear usuario verificado
    const result = await pool.query(
      `INSERT INTO usuarios
        (nombre, apellido, correo, contrasena, verificado, acepto_terminos, fecha_acepto_terminos)
       VALUES ($1, $2, $3, $4, true, true, NOW())
       RETURNING id, nombre, apellido, correo, rol, acepto_terminos`,
      [registro.nombre, registro.apellido, registro.correo, registro.contrasena]
    );

    // Eliminar token usado
    await pool.query(
      'DELETE FROM tokens_registro WHERE correo = $1',
      [correoNormalizado]
    );

    res.json({
      mensaje: 'Cuenta creada y correo verificado correctamente',
      usuario: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al verificar' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { correo, contrasena } = req.body;

  const correoNormalizado = correo?.trim().toLowerCase();

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE LOWER(correo) = $1',
      [correoNormalizado]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Correo o contrasena incorrectos' });
    }

    const usuario = result.rows[0];

    const valido = await bcrypt.compare(contrasena, usuario.contrasena);

    if (!valido) {
      return res.status(400).json({ error: 'Correo o contrasena incorrectos' });
    }

    if (!usuario.verificado) {
      return res.status(400).json({
        error: 'Debes verificar tu correo antes de iniciar sesion',
        sinVerificar: true,
        correo: usuario.correo
      });
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
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;