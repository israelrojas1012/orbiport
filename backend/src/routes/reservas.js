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

  const fechaObj = fecha instanceof Date
    ? fecha
    : new Date(fecha);

  const year = fechaObj.getUTCFullYear();
  const month = fechaObj.getUTCMonth();
  const day = fechaObj.getUTCDate();

  const [hora, minuto] = String(hora_inicio)
    .slice(0, 5)
    .split(':')
    .map(Number);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hora) ||
    Number.isNaN(minuto)
  ) {
    return false;
  }

  const fechaObjetivo = new Date(Date.UTC(
    year,
    month,
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
  const {
    usuario_id,
    horario_id,
    excepcion_id,
    fecha,
    confirmar_conflicto = false
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const columna = excepcion_id ? 'excepcion_id' : 'horario_id';
    const id = excepcion_id || horario_id;
    const tabla = excepcion_id
      ? 'horarios_excepciones'
      : 'horarios_plantilla';

    const existe = await client.query(
      `SELECT id
       FROM reservas
       WHERE usuario_id = $1
         AND ${columna} = $2
         AND fecha = $3`,
      [usuario_id, id, fecha]
    );

    if (existe.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: '⚠️ Ya tienes una reserva para este horario'
      });
    }

    const horario = await client.query(
      `SELECT cupos, hora_inicio, hora_fin, lugar_id
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

    const {
      cupos,
      hora_inicio,
      hora_fin,
      lugar_id
    } = horario.rows[0];

    // ============================================
    // VALIDAR MEMBRESIA DEL CLIENTE EN ESTE LUGAR
    // ============================================
    const membresia = await client.query(
      `SELECT id,
              estado,
              membresia_hasta,
              limite_reservas,
              membresia_inicio
      FROM inscripciones
      WHERE usuario_id = $1
        AND lugar_id = $2
      FOR UPDATE`,
      [usuario_id, lugar_id]
    );

    if (
      membresia.rows.length === 0 ||
      membresia.rows[0].estado !== 'aprobada'
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        error: '⚠️ No tienes una inscripción aprobada en este lugar'
      });
    }

    const datosMembresia = membresia.rows[0];

    // VALIDAR FECHA DE VIGENCIA
    if (datosMembresia.membresia_hasta) {
      const fechaReserva = String(fecha).slice(0, 10);
      const fechaLimite = datosMembresia.membresia_hasta instanceof Date
        ? datosMembresia.membresia_hasta.toISOString().slice(0, 10)
        : String(datosMembresia.membresia_hasta).slice(0, 10);

      if (fechaReserva > fechaLimite) {
        await client.query('ROLLBACK');

        return res.status(403).json({
          error: `⚠️ Tu membresía permite reservar únicamente hasta el ${fechaLimite}`
        });
      }
    }

    // VALIDAR LIMITE DE RESERVAS
    if (datosMembresia.limite_reservas !== null) {
      const reservasUsadas = await client.query(
        `SELECT COUNT(*) AS total
        FROM reservas r
        LEFT JOIN horarios_plantilla h
          ON r.horario_id = h.id
        LEFT JOIN horarios_excepciones e
          ON r.excepcion_id = e.id
        WHERE r.usuario_id = $1
          AND COALESCE(h.lugar_id, e.lugar_id) = $2
          AND (
            $3::timestamptz IS NULL
            OR r.creado_en >= $3::timestamptz
          )`,
        [
          usuario_id,
          lugar_id,
          datosMembresia.membresia_inicio
        ]
      );

      const usadas = Number(reservasUsadas.rows[0].total);
      const limite = Number(datosMembresia.limite_reservas);

      if (usadas >= limite) {
        await client.query('ROLLBACK');

        return res.status(403).json({
          error: '⚠️ Has alcanzado el límite de reservas de tu membresía'
        });
      }
    }

    if (!validarTiempoMinimo(fecha, hora_inicio)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: '⏰ No puedes reservar con menos de 2 horas de anticipación'
      });
    }

    if (!confirmar_conflicto) {
      const conflicto = await client.query(
        `SELECT
           r.id,
           r.fecha,
           COALESCE(h.hora_inicio, e.hora_inicio) AS hora_inicio,
           COALESCE(h.hora_fin, e.hora_fin) AS hora_fin,
           l.nombre AS lugar_nombre
         FROM reservas r
         LEFT JOIN horarios_plantilla h
           ON r.horario_id = h.id
         LEFT JOIN horarios_excepciones e
           ON r.excepcion_id = e.id
         LEFT JOIN lugares l
           ON l.id = COALESCE(h.lugar_id, e.lugar_id)
         WHERE r.usuario_id = $1
           AND r.fecha = $2
           AND (
             r.fecha + COALESCE(h.hora_inicio, e.hora_inicio)
           ) < (
             $2::date + $4::time
           )
           AND (
             $2::date + $3::time
           ) < (
             r.fecha + COALESCE(h.hora_fin, e.hora_fin)
           )
         ORDER BY COALESCE(h.hora_inicio, e.hora_inicio)
         LIMIT 1`,
        [
          usuario_id,
          fecha,
          hora_inicio,
          hora_fin
        ]
      );

      if (conflicto.rows.length > 0) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          error: '⚠️ Tienes otra reserva que se cruza con este horario',
          conflicto: conflicto.rows[0]
        });
      }
    }

    const reservados = await client.query(
      `SELECT COUNT(*)
       FROM reservas
       WHERE ${columna} = $1
         AND fecha = $2`,
      [id, fecha]
    );

    const cuposTotal = Number(cupos);
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
           VALUES ($1, $2, $3)
           RETURNING *`
        : `INSERT INTO reservas (usuario_id, horario_id, fecha)
           VALUES ($1, $2, $3)
           RETURNING *`,
      [usuario_id, id, fecha]
    );

    await client.query('COMMIT');

    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear reserva:', err);
    res.status(500).json({
      error: 'Error al crear reserva'
    });
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