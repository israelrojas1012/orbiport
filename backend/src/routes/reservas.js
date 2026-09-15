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

const obtenerAhoraEcuador = () => {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());

  const get = tipo => Number(partes.find(p => p.type === tipo).value);

  return new Date(Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second')
  ));
};

const validarTiempoMinimo = (fecha, hora_inicio) => {
  if (!fecha || !hora_inicio) return false;

  const ahora = obtenerAhoraEcuador();

  const fechaStr = fecha instanceof Date
    ? fecha.toISOString().slice(0, 10)
    : String(fecha).slice(0, 10);

  const horaStr = String(hora_inicio).slice(0, 5);

  const [year, month, day] = fechaStr.split('-').map(Number);
  const [hora, minuto] = horaStr.split(':').map(Number);

  if (
    !year || !month || !day ||
    Number.isNaN(hora) ||
    Number.isNaN(minuto)
  ) {
    return false;
  }

  const fechaObjetivo = new Date(Date.UTC(
    year,
    month - 1,
    day,
    hora,
    minuto,
    0
  ));

  const diferenciaHoras =
    (fechaObjetivo - ahora) / (1000 * 60 * 60);

  return diferenciaHoras >= 2;
};

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
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const columna = excepcion_id ? 'excepcion_id' : 'horario_id';
    const id = excepcion_id || horario_id;
    const tabla = excepcion_id
      ? 'horarios_excepciones'
      : 'horarios_plantilla';

    const existe = await client.query(
      `SELECT id FROM reservas
       WHERE usuario_id = $1 AND ${columna} = $2 AND fecha = $3`,
      [usuario_id, id, fecha]
    );

    if (existe.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: '⚠️ Ya tienes una reserva para este horario'
      });
    }

    const horario = await client.query(
      `SELECT cupos, hora_inicio
       FROM ${tabla}
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (horario.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: excepcion_id
          ? 'Horario especial no encontrado'
          : 'Horario no encontrado'
      });
    }

    if (!validarTiempoMinimo(fecha, horario.rows[0].hora_inicio)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: '⏰ No puedes reservar con menos de 2 horas de anticipación'
      });
    }

    const reservados = await client.query(
      `SELECT COUNT(*) FROM reservas
       WHERE ${columna} = $1 AND fecha = $2`,
      [id, fecha]
    );

    const cuposTotal = Number(horario.rows[0].cupos);
    const cuposReservados = Number(reservados.rows[0].count);

    if (cuposReservados >= cuposTotal) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: '⚠️ No hay cupos disponibles'
      });
    }

    const result = await client.query(
      excepcion_id
        ? `INSERT INTO reservas (usuario_id, excepcion_id, fecha)
           VALUES ($1, $2, $3) RETURNING *`
        : `INSERT INTO reservas (usuario_id, horario_id, fecha)
           VALUES ($1, $2, $3) RETURNING *`,
      [usuario_id, id, fecha]
    );

    await client.query('COMMIT');

    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear reserva:', err);
    res.status(500).json({ error: 'Error al crear reserva' });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const reserva = await pool.query(`
      SELECT r.*,
             COALESCE(h.hora_inicio, e.hora_inicio) AS hora_inicio,
             COALESCE(h.dia, 'Especial') AS dia
      FROM reservas r
      LEFT JOIN horarios_plantilla h ON r.horario_id = h.id
      LEFT JOIN horarios_excepciones e ON r.excepcion_id = e.id
      WHERE r.id = $1
    `, [id]);

    if (reserva.rows.length === 0) {
      return res.status(404).json({
        error: 'Reserva no encontrada'
      });
    }

    const r = reserva.rows[0];

    if (!r.fecha || !r.hora_inicio) {
      return res.status(400).json({
        error: 'No se pudo determinar la fecha y hora de la reserva'
      });
    }

    console.log('🕐 VALIDANDO CANCELACIÓN:', {
      fecha: r.fecha,
      hora_inicio: r.hora_inicio,
      tipo_fecha: typeof r.fecha
    });

    if (!validarTiempoMinimo(r.fecha, r.hora_inicio)) {
      return res.status(400).json({
        error: '⏰ No puedes cancelar con menos de 2 horas de anticipación'
      });
    }

    await pool.query(
      'DELETE FROM reservas WHERE id = $1',
      [id]
    );

    res.json({
      mensaje: 'Reserva cancelada'
    });
  } catch (err) {
    console.error('Error al cancelar reserva:', err);

    res.status(500).json({
      error: 'Error al cancelar reserva'
    });
  }
});

module.exports = router;