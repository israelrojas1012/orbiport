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

// SOLICITAR INSCRIPCION
router.post('/', verificarToken, async (req, res) => {
  const usuario_id = req.usuario.id;
  const { lugar_id } = req.body;
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
router.get('/usuario/:id', verificarToken, async (req, res) => {
  try {
    const id = req.usuario.id;
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

// SALIR DEL LUGAR (cliente)
router.delete('/salir/:usuario_id/:lugar_id', verificarToken, async (req, res) => {
  const usuario_id = req.usuario.id;
  const { lugar_id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const inscripcion = await client.query(
      `SELECT id, estado
       FROM inscripciones
       WHERE usuario_id = $1 AND lugar_id = $2`,
      [usuario_id, lugar_id]
    );

    if (inscripcion.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'No estás inscrito en este lugar'
      });
    }

    if (inscripcion.rows[0].estado !== 'aprobada') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Solo puedes salir de un lugar cuando tu inscripción está aprobada'
      });
    }

    const saldo = await client.query(
      `SELECT COALESCE(
         SUM(GREATEST(monto - pagado, 0)),
         0
       ) AS saldo_pendiente
       FROM penalizaciones
       WHERE usuario_id = $1
         AND lugar_id = $2
         AND estado != 'pagado'`,
      [usuario_id, lugar_id]
    );

    const reservas = await client.query(
      `SELECT COUNT(*) AS total
       FROM reservas r
       LEFT JOIN horarios_plantilla h
         ON r.horario_id = h.id
       LEFT JOIN horarios_excepciones e
         ON r.excepcion_id = e.id
       WHERE r.usuario_id = $1
         AND COALESCE(h.lugar_id, e.lugar_id) = $2
         AND (
           r.fecha::date > (NOW() AT TIME ZONE 'America/Guayaquil')::date
           OR (
             r.fecha::date = (NOW() AT TIME ZONE 'America/Guayaquil')::date
             AND COALESCE(h.hora_inicio, e.hora_inicio)
                 > (NOW() AT TIME ZONE 'America/Guayaquil')::time
           )
         )`,
      [usuario_id, lugar_id]
    );

    const saldoPendiente = Number(saldo.rows[0].saldo_pendiente);
    const reservasFuturas = Number(reservas.rows[0].total);

    if (saldoPendiente > 0 || reservasFuturas > 0) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        saldo_pendiente: saldoPendiente,
        reservas_futuras: reservasFuturas
      });
    }

    await client.query(
      'DELETE FROM inscripciones WHERE usuario_id = $1 AND lugar_id = $2',
      [usuario_id, lugar_id]
    );

    await client.query('COMMIT');

    res.json({
      mensaje: 'Has salido del lugar correctamente'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al salir del lugar:', err);

    res.status(500).json({
      error: 'Error al salir del lugar'
    });
  } finally {
    client.release();
  }
});

// CANCELAR INSCRIPCION (cliente)
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_id = req.usuario.id;

    const inscripcion = await pool.query(
      `SELECT estado
       FROM inscripciones
       WHERE id = $1
         AND usuario_id = $2`,
      [id, usuario_id]
    );

    if (inscripcion.rows.length === 0) {
      return res.status(404).json({
        error: 'Inscripcion no encontrada'
      });
    }

    await pool.query(
      `DELETE FROM inscripciones
       WHERE id = $1
         AND usuario_id = $2`,
      [id, usuario_id]
    );

    res.json({
      mensaje: 'Inscripcion cancelada'
    });
  } catch (err) {
    res.status(500).json({
      error: 'Error al cancelar inscripcion'
    });
  }
});

router.delete('/cancelar/:usuario_id/:lugar_id', verificarToken, async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const { lugar_id } = req.params;

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