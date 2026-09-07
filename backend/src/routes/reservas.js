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

router.get('/usuario/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT r.id, r.fecha, r.estado, r.horario_id, r.excepcion_id,
             l.nombre as lugar_nombre,
             COALESCE(h.dia, 'Especial') as dia,
             COALESCE(h.hora_inicio, e.hora_inicio) as hora_inicio,
             COALESCE(h.hora_fin, e.hora_fin) as hora_fin
      FROM reservas r
      LEFT JOIN horarios_plantilla h ON r.horario_id = h.id
      LEFT JOIN horarios_excepciones e ON r.excepcion_id = e.id
      LEFT JOIN lugares l ON l.id = COALESCE(h.lugar_id, e.lugar_id)
      WHERE r.usuario_id = $1
      ORDER BY r.creado_en DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
});

router.post('/', async (req, res) => {
  const { usuario_id, horario_id, excepcion_id, fecha } = req.body;
  try {
    // Reserva sobre un horario especial (excepción)
    if (excepcion_id) {
      const existeExc = await pool.query(
        'SELECT id FROM reservas WHERE usuario_id = $1 AND excepcion_id = $2 AND fecha = $3',
        [usuario_id, excepcion_id, fecha]
      );
      if (existeExc.rows.length > 0) {
        return res.status(400).json({ error: '⚠️ Ya tienes una reserva para este horario' });
      }

      const excepcion = await pool.query('SELECT cupos FROM horarios_excepciones WHERE id = $1', [excepcion_id]);
      if (excepcion.rows.length === 0) {
        return res.status(404).json({ error: 'Horario especial no encontrado' });
      }
      const reservadosExc = await pool.query(
        'SELECT COUNT(*) FROM reservas WHERE excepcion_id = $1 AND fecha = $2',
        [excepcion_id, fecha]
      );
      const cuposTotalExc = parseInt(excepcion.rows[0].cupos);
      const cuposReservadosExc = parseInt(reservadosExc.rows[0].count);
      if (cuposReservadosExc >= cuposTotalExc) {
        return res.status(400).json({ error: '⚠️ No hay cupos disponibles' });
      }

      const resultExc = await pool.query(
        'INSERT INTO reservas (usuario_id, excepcion_id, fecha) VALUES ($1, $2, $3) RETURNING *',
        [usuario_id, excepcion_id, fecha]
      );
      return res.status(201).json(resultExc.rows[0]);
    }

    // Reserva normal sobre un horario regular
    const existe = await pool.query(
      'SELECT id FROM reservas WHERE usuario_id = $1 AND horario_id = $2 AND fecha = $3',
      [usuario_id, horario_id, fecha]
    );
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: '⚠️ Ya tienes una reserva para este horario' });
    }
    // Contar cuantos cupos restan
    const horario = await pool.query('SELECT cupos FROM horarios_plantilla WHERE id = $1', [horario_id]);
    const reservados = await pool.query(
      'SELECT COUNT(*) FROM reservas WHERE horario_id = $1 AND fecha = $2',
      [horario_id, fecha]
    );
    const cuposTotal = parseInt(horario.rows[0].cupos);
    const cuposReservados = parseInt(reservados.rows[0].count);
    if (cuposReservados >= cuposTotal) {
      return res.status(400).json({ error: '⚠️ No hay cupos disponibles' });
    }
    const result = await pool.query(
      'INSERT INTO reservas (usuario_id, horario_id, fecha) VALUES ($1, $2, $3) RETURNING *',
      [usuario_id, horario_id, fecha]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear reserva' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reserva = await pool.query(`
      SELECT r.*,
             COALESCE(h.hora_inicio, e.hora_inicio) as hora_inicio,
             COALESCE(h.dia, 'Especial') as dia
      FROM reservas r
      LEFT JOIN horarios_plantilla h ON r.horario_id = h.id
      LEFT JOIN horarios_excepciones e ON r.excepcion_id = e.id
      WHERE r.id = $1
    `, [id]);

    if (reserva.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const r = reserva.rows[0];
    const ahora = new Date();
    const [h, m] = r.hora_inicio.split(':');
    const fechaReserva = new Date(r.fecha);
    fechaReserva.setHours(parseInt(h), parseInt(m), 0, 0);
    const diff = (fechaReserva - ahora) / (1000 * 60 * 60);

    if (diff < 2) {
      return res.status(400).json({ error: '⏰ No puedes cancelar con menos de 2 horas de anticipación' });
    }

    await pool.query('DELETE FROM reservas WHERE id = $1', [id]);
    res.json({ mensaje: 'Reserva cancelada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al cancelar reserva' });
  }
});

module.exports = router;