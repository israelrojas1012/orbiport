const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verificarToken } = require('../middleware/auth');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// OBTENER NOTIFICACIONES DE UN USUARIO
router.get('/:usuario_id', verificarToken, async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const result = await pool.query(
      'SELECT * FROM notificaciones WHERE usuario_id = $1 ORDER BY creado_en DESC',
      [usuario_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

// MARCAR COMO LEIDA
router.put('/:id/leer', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_id = req.usuario.id;

    const result = await pool.query(
      `UPDATE notificaciones
       SET leida = true
       WHERE id = $1
         AND usuario_id = $2
       RETURNING id`,
      [id, usuario_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Notificación no encontrada'
      });
    }

    res.json({ mensaje: 'Notificación leída' });
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar notificación' });
  }
});

// MARCAR TODAS COMO LEIDAS
router.put('/leer/todas/:usuario_id', verificarToken, async (req, res) => {
  try {
    const usuario_id = req.usuario.id;

    await pool.query(
      'UPDATE notificaciones SET leida = true WHERE usuario_id = $1',
      [usuario_id]
    );
    res.json({ mensaje: 'Todas leídas' });
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar notificaciones' });
  }
});

module.exports = router;
