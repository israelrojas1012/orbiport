const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// SOLICITAR INSCRIPCION
router.post('/', async (req, res) => {
  const { usuario_id, lugar_id } = req.body;
  try {
    const existe = await pool.query(
      'SELECT id, estado, creado_en FROM inscripciones WHERE usuario_id = $1 AND lugar_id = $2',
      [usuario_id, lugar_id]
    );
    if (existe.rows.length > 0) {
      const { estado, creado_en, id } = existe.rows[0];
      if (estado === 'pendiente' || estado === 'aprobada') {
        return res.status(400).json({ error: 'Ya tienes una solicitud activa para este lugar' });
      }
      if (estado === 'rechazada') {
        const horasPasadas = (Date.now() - new Date(creado_en).getTime()) / (1000 * 60 * 60);
        if (horasPasadas < 24) {
          const horasRestantes = Math.ceil(24 - horasPasadas);
          return res.status(400).json({ error: `Debes esperar ${horasRestantes} hora(s) mas para volver a solicitar` });
        }
        await pool.query(
          'UPDATE inscripciones SET estado = $1, creado_en = NOW() WHERE id = $2',
          ['pendiente', id]
        );
        return res.status(201).json({ mensaje: 'Solicitud reenviada correctamente' });
      }
    }
    await pool.query(
      'INSERT INTO inscripciones (usuario_id, lugar_id) VALUES ($1, $2)',
      [usuario_id, lugar_id]
    );
    res.status(201).json({ mensaje: 'Solicitud enviada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al inscribirse' });
  }
});

// OBTENER INSCRIPCIONES DE UN USUARIO
router.get('/usuario/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT i.id, i.estado, i.creado_en, i.lugar_id,
             l.nombre as lugar_nombre,
             l.direccion
      FROM inscripciones i
      JOIN lugares l ON i.lugar_id = l.id
      WHERE i.usuario_id = $1
      ORDER BY i.creado_en DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener inscripciones' });
  }
});

// CANCELAR INSCRIPCION (cliente)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const inscripcion = await pool.query('SELECT estado FROM inscripciones WHERE id = $1', [id]);
    if (inscripcion.rows.length === 0) return res.status(404).json({ error: 'Inscripcion no encontrada' });
    await pool.query('DELETE FROM inscripciones WHERE id = $1', [id]);
    res.json({ mensaje: 'Inscripcion cancelada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al cancelar inscripcion' });
  }
});

router.delete('/cancelar/:usuario_id/:lugar_id', async (req, res) => {
  try {
    const { usuario_id, lugar_id } = req.params;

    const inscripcion = await pool.query(
      'SELECT id, estado FROM inscripciones WHERE usuario_id=$1 AND lugar_id=$2',
      [usuario_id, lugar_id]
    );

    if (inscripcion.rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró la solicitud' });
    }

    if (inscripcion.rows[0].estado !== 'pendiente') {
      return res.status(400).json({ error: 'Solo puedes cancelar solicitudes pendientes' });
    }

    await pool.query(
      'DELETE FROM inscripciones WHERE usuario_id=$1 AND lugar_id=$2',
      [usuario_id, lugar_id]
    );

    res.json({ mensaje: 'Solicitud cancelada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al cancelar solicitud' });
  }
});

module.exports = router;