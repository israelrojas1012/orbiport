 const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { enviarEmail } = require('../email');
const { verificarToken } = require('../middleware/auth');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ACTUALIZAR PERFIL
router.put('/:id', verificarToken, async (req, res) => {
  try {
    const id = req.usuario.id;
    const { nombre, apellido, nickname, avatar } = req.body;

    const usuarioResult = await pool.query(
      'SELECT rol FROM usuarios WHERE id = $1',
      [id]
    );

    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const rol = usuarioResult.rows[0].rol;

    // Validar avatar
    const avataresPermitidos = [
      'avatar_01',
      'avatar_02',
      'avatar_03',
      'avatar_04',
      'avatar_05',
      'avatar_06',
      'avatar_07',
      'avatar_08',
      'avatar_09',
      'avatar_10',
      'avatar_11',
      'avatar_12'
    ];

    if (avatar && !avataresPermitidos.includes(avatar)) {
      return res.status(400).json({ error: 'Avatar no válido' });
    }

    // Los clientes pueden tener nickname
    if (rol === 'cliente' && nickname) {
      const nicknameLimpio = nickname.trim();

      if (nicknameLimpio.length < 3 || nicknameLimpio.length > 30) {
        return res.status(400).json({
          error: 'El nickname debe tener entre 3 y 30 caracteres'
        });
      }

      if (!/^[a-zA-Z0-9._]+$/.test(nicknameLimpio)) {
        return res.status(400).json({
          error: 'El nickname solo puede contener letras, números, punto y guion bajo'
        });
      }

      const existe = await pool.query(
        `SELECT id
         FROM usuarios
         WHERE LOWER(nickname) = LOWER($1)
         AND id != $2`,
        [nicknameLimpio, id]
      );

      if (existe.rows.length > 0) {
        return res.status(409).json({
          error: 'Ese nickname ya está en uso'
        });
      }

      const result = await pool.query(
        `UPDATE usuarios
         SET nombre = $1,
             apellido = $2,
             nickname = $3,
             avatar = $4
         WHERE id = $5
         RETURNING id, nombre, apellido, correo, rol, nickname, avatar`,
        [nombre, apellido, nicknameLimpio, avatar || null, id]
      );

      return res.json({
        mensaje: 'Perfil actualizado',
        usuario: result.rows[0]
      });
    }

    // Administradores: avatar sí, nickname no
    const result = await pool.query(
      `UPDATE usuarios
       SET nombre = $1,
           apellido = $2,
           avatar = $3
       WHERE id = $4
       RETURNING id, nombre, apellido, correo, rol, nickname, avatar`,
      [nombre, apellido, avatar || null, id]
    );

    res.json({
      mensaje: 'Perfil actualizado',
      usuario: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    if (err.code === '23505') {
      return res.status(409).json({
        error: 'Ese nickname ya está en uso'
      });
    }

    res.status(500).json({
      error: 'Error al actualizar perfil'
    });
  }
});

// CAMBIAR CONTRASEÑA
router.put('/:id/password', verificarToken, async (req, res) => {
  try {
    const id = req.usuario.id;
    const { actual, nueva } = req.body;
    if (!actual || !nueva) {
      return res.status(400).json({ error: 'Completa todos los campos' });
    }
    const contrasenaRegex = /^(?=.*[a-zA-Z])(?=.*[0-9]).{6,}$/;
    if (!contrasenaRegex.test(nueva)) {
      return res.status(400).json({
        error: 'La nueva contrasena debe tener letras y numeros, minimo 6 caracteres'
      });
    }
    const result = await pool.query(
      'SELECT contrasena, correo, nombre FROM usuarios WHERE id=$1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const valido = await bcrypt.compare(actual, result.rows[0].contrasena);
    if (!valido) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }
    const hash = await bcrypt.hash(nueva, 10);
    await pool.query(
      'UPDATE usuarios SET contrasena=$1 WHERE id=$2',
      [hash, id]
    );
    await enviarEmail(
      result.rows[0].correo,
      'Contraseña actualizada - Orbiport',
      `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5;">Contraseña actualizada</h2>
          <p>Hola ${result.rows[0].nombre},</p>
          <p>Tu contraseña de Orbiport fue cambiada correctamente.</p>
          <p style="color: #999; font-size: 13px;">
            Si tú no realizaste este cambio, revisa tu cuenta inmediatamente.
          </p>
        </div>
      `
    );
    res.json({ mensaje: 'Contrasena actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar contrasena' });
  }
});

// OBTENER SALDO DE PENALIZACIONES
router.get('/:id/saldo', verificarToken, async (req, res) => {
  try {
    const id = req.usuario.id;
    // Total general
    const total = await pool.query(`
      SELECT 
        COUNT(*) as total_faltas,
        SUM(monto) as total_deuda,
        SUM(pagado) as total_pagado,
        SUM(monto - pagado) as saldo_pendiente
      FROM penalizaciones 
      WHERE usuario_id = $1 AND estado != 'pagado'
    `, [id]);
    // Desglose por lugar
    const porLugar = await pool.query(`
      SELECT 
        l.id as lugar_id,
        l.nombre as lugar_nombre,
        l.telefono as lugar_telefono,
        COUNT(p.id) as total_faltas,
        SUM(p.monto - p.pagado) as saldo_pendiente
      FROM penalizaciones p
      JOIN lugares l ON p.lugar_id = l.id
      WHERE p.usuario_id = $1
      GROUP BY l.id, l.nombre, l.telefono
      HAVING SUM(p.monto - p.pagado) > 0
      ORDER BY saldo_pendiente DESC
    `, [id]);
    res.json({ ...total.rows[0], por_lugar: porLugar.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener saldo' });
  }
});

// ACEPTAR TERMINOS Y CONDICIONES
router.put('/:id/aceptar-terminos', verificarToken, async (req, res) => {
  try {
    const id = req.usuario.id;
    await pool.query(
      'UPDATE usuarios SET acepto_terminos=TRUE, fecha_acepto_terminos=NOW() WHERE id=$1',
      [id]
    );
    res.json({ mensaje: 'Terminos aceptados correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al aceptar terminos' });
  }
});

module.exports = router;
