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

// OBTENER RESERVAS DE UN HORARIO Y FECHA PARA PASAR LISTA
router.get('/lista/:lugar_id/:fecha', async (req, res) => {
  try {
    const { lugar_id, fecha } = req.params;
    const result = await pool.query(`
      SELECT r.id as reserva_id, r.fecha, r.usuario_id,
             u.nombre, u.apellido,
             COALESCE(h.hora_inicio, e.hora_inicio) as hora_inicio,
             COALESCE(h.hora_fin, e.hora_fin) as hora_fin,
             COALESCE(h.dia, 'Especial') as dia,
             a.asistio, a.id as asistencia_id
      FROM reservas r
      JOIN usuarios u ON r.usuario_id = u.id
      LEFT JOIN horarios_plantilla h ON r.horario_id = h.id
      LEFT JOIN horarios_excepciones e ON r.excepcion_id = e.id
      LEFT JOIN asistencia a ON a.reserva_id = r.id
      WHERE COALESCE(h.lugar_id, e.lugar_id) = $1 AND r.fecha = $2
      ORDER BY hora_inicio, u.nombre
    `, [lugar_id, fecha]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener lista' });
  }
});

// MARCAR ASISTENCIA INDIVIDUAL
router.post('/marcar', async (req, res) => {
  try {
    const { reserva_id, usuario_id, lugar_id, fecha, asistio } = req.body;

    const existe = await pool.query('SELECT id FROM asistencia WHERE reserva_id = $1', [reserva_id]);

    if (existe.rows.length > 0) {
      await pool.query('UPDATE asistencia SET asistio = $1 WHERE reserva_id = $2', [asistio, reserva_id]);
    } else {
      await pool.query(
        'INSERT INTO asistencia (reserva_id, usuario_id, lugar_id, fecha, asistio) VALUES ($1,$2,$3,$4,$5)',
        [reserva_id, usuario_id, lugar_id, fecha, asistio]
      );
    }

    if (!asistio) {
      const yapenalizado = await pool.query(
        'SELECT id FROM penalizaciones WHERE asistencia_id = (SELECT id FROM asistencia WHERE reserva_id = $1)',
        [reserva_id]
      );
      if (yapenalizado.rows.length === 0) {
        const asistencia = await pool.query('SELECT id FROM asistencia WHERE reserva_id = $1', [reserva_id]);
        await pool.query(
          'INSERT INTO penalizaciones (usuario_id, lugar_id, asistencia_id) VALUES ($1,$2,$3)',
          [usuario_id, lugar_id, asistencia.rows[0].id]
        );
        const lugar = await pool.query('SELECT nombre FROM lugares WHERE id = $1', [lugar_id]);
        await pool.query(
          'INSERT INTO notificaciones (usuario_id, mensaje) VALUES ($1, $2)',
          [usuario_id, `Tienes una falta registrada en "${lugar.rows[0].nombre}". Se ha generado un cargo de $0.25.`]
        );
      }
    } else {
      await pool.query(`
        DELETE FROM penalizaciones WHERE asistencia_id = (
          SELECT id FROM asistencia WHERE reserva_id = $1
        ) AND estado = 'pendiente'
      `, [reserva_id]);
    }

    res.json({ mensaje: 'Asistencia registrada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar asistencia' });
  }
});

// MARCAR TODOS COMO ASISTIERON
router.post('/todos', async (req, res) => {
  try {
    const { lugar_id, fecha } = req.body;
    const reservas = await pool.query(`
      SELECT r.id as reserva_id, r.usuario_id
      FROM reservas r
      LEFT JOIN horarios_plantilla h ON r.horario_id = h.id
      LEFT JOIN horarios_excepciones e ON r.excepcion_id = e.id
      WHERE COALESCE(h.lugar_id, e.lugar_id) = $1 AND r.fecha = $2
    `, [lugar_id, fecha]);

    for (const r of reservas.rows) {
      const existe = await pool.query('SELECT id FROM asistencia WHERE reserva_id = $1', [r.reserva_id]);
      if (existe.rows.length > 0) {
        await pool.query('UPDATE asistencia SET asistio = true WHERE reserva_id = $1', [r.reserva_id]);
      } else {
        await pool.query(
          'INSERT INTO asistencia (reserva_id, usuario_id, lugar_id, fecha, asistio) VALUES ($1,$2,$3,$4,true)',
          [r.reserva_id, r.usuario_id, lugar_id, fecha]
        );
      }
    }
    res.json({ mensaje: 'Todos marcados como asistieron' });
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar asistencia' });
  }
});

// OBTENER PENALIZACIONES DE UN USUARIO EN UN LUGAR
router.get('/penalizaciones/:usuario_id/:lugar_id', async (req, res) => {
  try {
    const { usuario_id, lugar_id } = req.params;
    const result = await pool.query(`
      SELECT p.*, a.fecha
      FROM penalizaciones p
      JOIN asistencia a ON p.asistencia_id = a.id
      WHERE p.usuario_id = $1 AND p.lugar_id = $2
      ORDER BY p.creado_en DESC
    `, [usuario_id, lugar_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener penalizaciones' });
  }
});

// REGISTRAR PAGO PARCIAL O TOTAL
router.put('/penalizaciones/:id/pago', async (req, res) => {
  try {
    const { id } = req.params;
    const { monto_pagado } = req.body;
    const pen = await pool.query('SELECT * FROM penalizaciones WHERE id = $1', [id]);
    if (pen.rows.length === 0) return res.status(404).json({ error: 'Penalizacion no encontrada' });
    const total_pagado = parseFloat(pen.rows[0].pagado) + parseFloat(monto_pagado);
    const estado = total_pagado >= parseFloat(pen.rows[0].monto) ? 'pagado' : 'pendiente';
    await pool.query(
      'UPDATE penalizaciones SET pagado = $1, estado = $2 WHERE id = $3',
      [total_pagado, estado, id]
    );
    res.json({ mensaje: 'Pago registrado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar pago' });
  }
});

// OBTENER TODAS LAS PENALIZACIONES DE UN LUGAR
router.get('/penalizaciones/lugar/:lugar_id', async (req, res) => {
  console.log('>>> Entrando a penalizaciones/lugar', req.params.lugar_id);
  try {
    const { lugar_id } = req.params;
    const result = await pool.query(`
      SELECT p.*, a.fecha,
             u.nombre, u.apellido
      FROM penalizaciones p
      JOIN asistencia a ON p.asistencia_id = a.id
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.lugar_id = $1
      ORDER BY p.creado_en DESC
    `, [lugar_id]);
    console.log('>>> Resultado:', result.rows.length, 'filas');
    res.json(result.rows);
  } catch (err) {
    console.error('>>> ERROR en penalizaciones/lugar:', err.message);
    console.error(err);
    res.status(500).json({ error: 'Error al obtener penalizaciones' });
  }
});

// RESUMEN DE SALDOS POR USUARIO EN UN LUGAR
router.get('/saldos/:lugar_id', async (req, res) => {
  try {
    const { lugar_id } = req.params;
    const result = await pool.query(`
      SELECT 
        u.id as usuario_id,
        u.nombre, u.apellido,
        COUNT(p.id) as total_faltas,
        SUM(p.monto) as total_deuda,
        SUM(p.pagado) as total_pagado,
        SUM(p.monto - p.pagado) as saldo_pendiente
      FROM penalizaciones p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.lugar_id = $1
      GROUP BY u.id, u.nombre, u.apellido
      HAVING SUM(p.monto - p.pagado) > 0
      ORDER BY saldo_pendiente DESC
    `, [lugar_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener saldos' });
  }
});

// REGISTRAR PAGO LIBRE (monto personalizado)
router.put('/saldos/:usuario_id/:lugar_id/pago', async (req, res) => {
  try {
    const { usuario_id, lugar_id } = req.params;
    const { monto_pagado } = req.body;
    
    const pendientes = await pool.query(`
      SELECT * FROM penalizaciones 
      WHERE usuario_id=$1 AND lugar_id=$2 AND estado != 'pagado'
      ORDER BY creado_en ASC
    `, [usuario_id, lugar_id]);

    let restante = parseFloat(monto_pagado);
    for (const p of pendientes.rows) {
      if (restante <= 0) break;
      const deuda = parseFloat(p.monto) - parseFloat(p.pagado);
      if (restante >= deuda) {
        await pool.query('UPDATE penalizaciones SET pagado=$1, estado=$2 WHERE id=$3', [p.monto, 'pagado', p.id]);
        restante -= deuda;
      } else {
        await pool.query('UPDATE penalizaciones SET pagado=$1 WHERE id=$2', [parseFloat(p.pagado) + restante, p.id]);
        restante = 0;
      }
    }

    await pool.query(
      'INSERT INTO notificaciones (usuario_id, mensaje) VALUES ($1, $2)',
      [usuario_id, `Se registro un pago de $${parseFloat(monto_pagado).toFixed(2)} en tu cuenta.`]
    );

    res.json({ mensaje: 'Pago registrado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar pago' });
  }
});

// OBTENER HORARIOS CON RESERVAS DE UN DIA (incluye horarios especiales)
router.get('/horarios-dia/:lugar_id/:fecha', async (req, res) => {
  try {
    const { lugar_id, fecha } = req.params;
    const normales = await pool.query(`
      SELECT h.id as horario_id, h.hora_inicio, h.hora_fin, h.cupos,
             COUNT(r.id) as reservados
      FROM horarios_plantilla h
      INNER JOIN reservas r ON r.horario_id = h.id AND r.fecha = $2
      WHERE h.lugar_id = $1 AND h.activo = true
      GROUP BY h.id
      ORDER BY h.hora_inicio ASC
    `, [lugar_id, fecha]);

    const especiales = await pool.query(`
      SELECT e.id as horario_id, e.hora_inicio, e.hora_fin, e.cupos,
             COUNT(r.id) as reservados
      FROM horarios_excepciones e
      INNER JOIN reservas r ON r.excepcion_id = e.id AND r.fecha = $2
      WHERE e.lugar_id = $1 AND e.cerrado = false
      GROUP BY e.id
      ORDER BY e.hora_inicio ASC
    `, [lugar_id, fecha]);

    res.json([...normales.rows, ...especiales.rows]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener horarios' });
  }
});

// OBTENER RESERVAS DE UN HORARIO ESPECIFICO (normal o especial)
router.get('/horario/:horario_id/:fecha', async (req, res) => {
  try {
    const { horario_id, fecha } = req.params;
    const result = await pool.query(`
      SELECT r.id as reserva_id, r.fecha, r.usuario_id,
             u.nombre, u.apellido,
             a.asistio, a.id as asistencia_id
      FROM reservas r
      JOIN usuarios u ON r.usuario_id = u.id
      LEFT JOIN asistencia a ON a.reserva_id = r.id
      WHERE (r.horario_id = $1 OR r.excepcion_id = $1) AND r.fecha = $2
      ORDER BY u.nombre
    `, [horario_id, fecha]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
});

// OBTENER PERSONAS RESERVADAS EN UN HORARIO (vista cliente) - normal o especial
router.get('/personas/:horario_id/:fecha', async (req, res) => {
  try {
    const { horario_id, fecha } = req.params;
    const result = await pool.query(`
      SELECT u.nombre, u.apellido
      FROM reservas r
      JOIN usuarios u ON r.usuario_id = u.id
      WHERE (r.horario_id = $1 OR r.excepcion_id = $1) AND r.fecha = $2
      ORDER BY u.nombre ASC
    `, [horario_id, fecha]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener personas' });
  }
});

module.exports = router;