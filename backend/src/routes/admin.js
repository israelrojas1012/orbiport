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

const validarTiempoMinimo = (dia, hora_inicio) => {
  const dias = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado'
  ];

  const ahora = obtenerAhoraEcuador();
  const diaObjetivo = dias.indexOf(dia);

  if (diaObjetivo === -1 || !hora_inicio) return false;

  let diffDias = diaObjetivo - ahora.getUTCDay();
  if (diffDias < 0) diffDias += 7;

  const [h, m] = String(hora_inicio).slice(0, 5).split(':');

  const horaObjetivo = new Date(ahora);
  horaObjetivo.setUTCDate(ahora.getUTCDate() + diffDias);
  horaObjetivo.setUTCHours(Number(h), Number(m), 0, 0);

  const diferenciaHoras =
    (horaObjetivo - ahora) / (1000 * 60 * 60);

  return diferenciaHoras >= 24;
};

const validarFechaHoraMinima = (fecha, hora_inicio) => {
  if (!fecha || !hora_inicio) return false;

  const ahora = obtenerAhoraEcuador();

  const [year, month, day] = String(fecha).slice(0, 10).split('-');
  const [h, m] = String(hora_inicio).slice(0, 5).split(':');

  const fechaObjetivo = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(h),
    Number(m),
    0
  ));

  const diferenciaHoras =
    (fechaObjetivo - ahora) / (1000 * 60 * 60);

  return diferenciaHoras >= 24;
};

router.get('/lugar/:admin_id', async (req, res) => {
  try {
    const { admin_id } = req.params;
    const result = await pool.query('SELECT * FROM lugares WHERE admin_id = $1', [admin_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No tienes un lugar asignado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener lugar' });
  }
});

router.put('/lugar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, direccion, telefono, foto_url, categoria, maps_url } = req.body;
    await pool.query(
      'UPDATE lugares SET nombre=$1, descripcion=$2, direccion=$3, telefono=$4, foto_url=$5, categoria=$6, maps_url=$7 WHERE id=$8',
      [nombre, descripcion, direccion, telefono, foto_url, categoria, maps_url, id]
    );
    res.json({ mensaje: 'Lugar actualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar lugar' });
  }
});

router.get('/inscripciones/:lugar_id', async (req, res) => {
  try {
    const { lugar_id } = req.params;
    const result = await pool.query(`
      SELECT i.id,
              i.usuario_id,
              i.estado,
              i.creado_en,
              i.membresia_hasta,
              i.limite_reservas,
              u.nombre,
              u.apellido,
              u.correo,
              u.nickname,
              u.avatar
      FROM inscripciones i
      JOIN usuarios u ON i.usuario_id = u.id
      WHERE i.lugar_id = $1
      ORDER BY u.apellido ASC, u.nombre ASC
    `, [lugar_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener inscripciones' });
  }
});

// GESTIONAR MEMBRESIA DE UN CLIENTE
router.put('/inscripciones/:id/membresia', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      membresia_hasta,
      limite_reservas
    } = req.body;

    if (
      limite_reservas !== null &&
      limite_reservas !== undefined &&
      limite_reservas !== '' &&
      (!Number.isInteger(Number(limite_reservas)) || Number(limite_reservas) < 0)
    ) {
      return res.status(400).json({
        error: 'El límite de reservas debe ser un número entero mayor o igual a 0'
      });
    }

    const inscripcion = await pool.query(
      `SELECT id
       FROM inscripciones
       WHERE id = $1`,
      [id]
    );

    if (inscripcion.rows.length === 0) {
      return res.status(404).json({
        error: 'Inscripción no encontrada'
      });
    }

    await pool.query(
      `UPDATE inscripciones
      SET membresia_hasta = $1,
          limite_reservas = $2,
          membresia_inicio = NOW()
      WHERE id = $3`,
      [
        membresia_hasta || null,
        limite_reservas === '' ||
        limite_reservas === null ||
        limite_reservas === undefined
          ? null
          : Number(limite_reservas),
        id
      ]
    );

    res.json({
      mensaje: 'Membresía actualizada correctamente'
    });

  } catch (err) {
    console.error('Error al actualizar membresía:', err);

    res.status(500).json({
      error: 'Error al actualizar membresía'
    });
  }
});

router.put('/inscripciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    await pool.query('UPDATE inscripciones SET estado = $1 WHERE id = $2', [estado, id]);
    const inscripcion = await pool.query(`
      SELECT i.usuario_id, l.nombre as lugar_nombre
      FROM inscripciones i
      JOIN lugares l ON i.lugar_id = l.id
      WHERE i.id = $1
    `, [id]);
    const { usuario_id, lugar_nombre } = inscripcion.rows[0];
    const mensaje = estado === 'aprobada'
      ? `Tu solicitud para unirte a "${lugar_nombre}" fue aprobada. Ya puedes reservar!`
      : `Tu solicitud para unirte a "${lugar_nombre}" fue rechazada.`;
    await pool.query(
      'INSERT INTO notificaciones (usuario_id, mensaje) VALUES ($1, $2)',
      [usuario_id, mensaje]
    );
    res.json({ mensaje: 'Inscripcion actualizada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar inscripcion' });
  }
});

router.delete('/inscripciones/:id', async (req, res) => {
  const { id } = req.params;
  const { confirmar_eliminacion = false } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const inscripcion = await client.query(
      `SELECT i.id,
              i.usuario_id,
              i.lugar_id,
              u.nombre,
              u.apellido,
              l.nombre AS lugar_nombre
       FROM inscripciones i
       JOIN usuarios u ON i.usuario_id = u.id
       JOIN lugares l ON i.lugar_id = l.id
       WHERE i.id = $1`,
      [id]
    );

    if (inscripcion.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Inscripcion no encontrada'
      });
    }

    const i = inscripcion.rows[0];

    const saldo = await client.query(
      `SELECT COALESCE(
         SUM(GREATEST(monto - pagado, 0)),
         0
       ) AS saldo_pendiente
       FROM penalizaciones
       WHERE usuario_id = $1
         AND lugar_id = $2
         AND estado != 'pagado'`,
      [i.usuario_id, i.lugar_id]
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
      [i.usuario_id, i.lugar_id]
    );

    const saldoPendiente = Number(saldo.rows[0].saldo_pendiente);
    const reservasFuturas = Number(reservas.rows[0].total);

    if (
      !confirmar_eliminacion &&
      (saldoPendiente > 0 || reservasFuturas > 0)
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        advertencia: {
          nombre: `${i.nombre} ${i.apellido}`,
          lugar_nombre: i.lugar_nombre,
          saldo_pendiente: saldoPendiente,
          reservas_futuras: reservasFuturas
        }
      });
    }

    if (confirmar_eliminacion && reservasFuturas > 0) {
      await client.query(
        `DELETE FROM reservas
         WHERE id IN (
           SELECT r.id
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
             )
         )`,
        [i.usuario_id, i.lugar_id]
      );
    }

    await client.query(
      'DELETE FROM inscripciones WHERE id = $1',
      [id]
    );

    await client.query('COMMIT');

    res.json({
      mensaje: 'Inscripcion eliminada',
      reservas_canceladas: reservasFuturas,
      saldo_pendiente: saldoPendiente
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar inscripcion:', err);

    res.status(500).json({
      error: 'Error al eliminar inscripcion'
    });
  } finally {
    client.release();
  }
});

// MEMBRESIAS DE UN CLIENTE
router.get('/membresias/usuario/:usuario_id', verificarToken, async (req, res) => {
  try {
    const usuario_id = req.usuario.id;

    const result = await pool.query(
      `SELECT
         i.id,
         i.lugar_id,
         l.nombre AS lugar_nombre,
         i.membresia_hasta,
         i.limite_reservas,
         i.membresia_inicio,
         COUNT(r.id) FILTER (
           WHERE
             i.membresia_inicio IS NULL
             OR r.creado_en >= i.membresia_inicio
         ) AS reservas_usadas
       FROM inscripciones i
        JOIN lugares l
          ON l.id = i.lugar_id
        JOIN (
          SELECT lugar_id, MAX(id) AS ultima_inscripcion_id
          FROM inscripciones
          WHERE usuario_id = $1
            AND estado = 'aprobada'
            AND (
              membresia_hasta IS NOT NULL
              OR limite_reservas IS NOT NULL
            )
          GROUP BY lugar_id
        ) ultima
          ON ultima.ultima_inscripcion_id = i.id
       LEFT JOIN reservas r
         ON r.usuario_id = i.usuario_id
        AND (
          r.horario_id IN (
            SELECT id
            FROM horarios_plantilla
            WHERE lugar_id = i.lugar_id
          )
          OR
          r.excepcion_id IN (
            SELECT id
            FROM horarios_excepciones
            WHERE lugar_id = i.lugar_id
          )
        )
       WHERE i.usuario_id = $1
         AND i.estado = 'aprobada'
         AND (
           i.membresia_hasta IS NOT NULL
           OR i.limite_reservas IS NOT NULL
         )
       GROUP BY
         i.id,
         i.lugar_id,
         l.nombre,
         i.membresia_hasta,
         i.limite_reservas,
         i.membresia_inicio
       ORDER BY l.nombre ASC`,
      [usuario_id]
    );

    const membresias = result.rows.map(m => {
      const usadas = Number(m.reservas_usadas || 0);

      const limite = m.limite_reservas === null
        ? null
        : Number(m.limite_reservas);

      return {
        ...m,
        reservas_usadas: usadas,
        reservas_disponibles:
          limite === null
            ? null
            : Math.max(limite - usadas, 0)
      };
    });

    res.json(membresias);
  } catch (err) {
    console.error('Error al obtener membresías:', err);

    res.status(500).json({
      error: 'Error al obtener membresías'
    });
  }
});

router.get('/horarios/:lugar_id', async (req, res) => {
  try {
    const { lugar_id } = req.params;

    const result = await pool.query(
      `SELECT h.*,
        (
          SELECT COUNT(*)
          FROM reservas r
          WHERE r.horario_id = h.id
            AND r.fecha = CURRENT_DATE + (
              (
                CASE h.dia
                  WHEN 'Domingo' THEN 0
                  WHEN 'Lunes' THEN 1
                  WHEN 'Martes' THEN 2
                  WHEN 'Miércoles' THEN 3
                  WHEN 'Jueves' THEN 4
                  WHEN 'Viernes' THEN 5
                  WHEN 'Sábado' THEN 6
                END
              ) - EXTRACT(DOW FROM CURRENT_DATE)::int + 7
            ) % 7
        ) AS reservados,
        (
          SELECT COUNT(*)
          FROM reservas r
          WHERE r.horario_id = h.id
            AND r.fecha >= CURRENT_DATE
        ) AS reservas_activas
       FROM horarios_plantilla h
       WHERE h.lugar_id = $1
       ORDER BY
         CASE h.dia
           WHEN 'Lunes' THEN 1
           WHEN 'Martes' THEN 2
           WHEN 'Miércoles' THEN 3
           WHEN 'Jueves' THEN 4
           WHEN 'Viernes' THEN 5
           WHEN 'Sábado' THEN 6
           WHEN 'Domingo' THEN 7
         END,
         h.hora_inicio ASC`,
      [lugar_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener horarios:', err);
    res.status(500).json({ error: 'Error al obtener horarios' });
  }
});

router.post('/horarios', async (req, res) => {
  try {
    const {
      lugar_id,
      dia,
      hora_inicio,
      hora_fin,
      cupos,
      tipo_cancha,
      instructor,
      descripcion
    } = req.body;
    if (!validarTiempoMinimo(dia, hora_inicio)) {
      return res.status(400).json({
        error: 'No puedes crear un horario con menos de 24 horas de anticipación'
      });
    }
    if (hora_fin <= hora_inicio) {
      return res.status(400).json({ error: 'La hora de fin debe ser mayor que la hora de inicio' });
    }
    const existe = await pool.query(
      `SELECT id, tipo_cancha FROM horarios_plantilla 
       WHERE lugar_id=$1 AND dia=$2 AND activo=true
       AND NOT (hora_fin <= $3 OR hora_inicio >= $4)
       AND ($5::varchar IS NULL OR tipo_cancha IS NULL OR tipo_cancha = $5)`,
      [lugar_id, dia, hora_inicio, hora_fin, tipo_cancha || null]
    );
    if (existe.rows.length > 0) {
      if (tipo_cancha && existe.rows[0].tipo_cancha === tipo_cancha) {
        return res.status(400).json({ error: `Ya existe una cancha ${tipo_cancha} que se cruza con ese horario. Cambia la hora o el tipo de cancha.` });
      }
      return res.status(400).json({ error: 'Ya existe un horario que se cruza con ese rango de horas' });
    }
    const result = await pool.query(
      `INSERT INTO horarios_plantilla
      (lugar_id, dia, hora_inicio, hora_fin, cupos, tipo_cancha, instructor, descripcion, activo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING *`,
      [
        lugar_id,
        dia,
        hora_inicio,
        hora_fin,
        cupos,
        tipo_cancha || null,
        instructor?.trim() || null,
        descripcion?.trim() || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al agregar horario' });
  }
});

router.put('/horarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      hora_inicio,
      hora_fin,
      cupos,
      activo,
      dia,
      tipo_cancha,
      instructor,
      descripcion
    } = req.body;

    if (!validarTiempoMinimo(dia, hora_inicio)) {
      return res.status(400).json({
        error: 'No puedes editar un horario con menos de 24 horas de anticipación'
      });
    }

    if (hora_fin <= hora_inicio) {
      return res.status(400).json({
        error: 'La hora de fin debe ser mayor que la hora de inicio'
      });
    }

    const actual = await pool.query(
      `SELECT h.*,
        (SELECT COUNT(*) FROM reservas r
         WHERE r.horario_id = h.id
           AND r.fecha >= CURRENT_DATE) AS reservas_activas
       FROM horarios_plantilla h
       WHERE h.id = $1`,
      [id]
    );

    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    const horarioActual = actual.rows[0];
    const reservasActivas = Number(horarioActual.reservas_activas);

    const horaActualInicio = String(horarioActual.hora_inicio).slice(0, 5);
    const horaActualFin = String(horarioActual.hora_fin).slice(0, 5);
    const nuevaHoraInicio = String(hora_inicio).slice(0, 5);
    const nuevaHoraFin = String(hora_fin).slice(0, 5);

    if (reservasActivas > 0) {
      if (
        nuevaHoraInicio !== horaActualInicio ||
        nuevaHoraFin !== horaActualFin
      ) {
        return res.status(400).json({
          error: `No puedes cambiar la hora porque este horario tiene ${reservasActivas} reserva(s) activa(s).`
        });
      }

      if (Number(cupos) < reservasActivas) {
        return res.status(400).json({
          error: `No puedes reducir los cupos a ${cupos}. Ya existen ${reservasActivas} reserva(s) activa(s) para este horario.`
        });
      }
    }

    const lugar_id = horarioActual.lugar_id;

    const existe = await pool.query(
      `SELECT id, tipo_cancha
       FROM horarios_plantilla
       WHERE lugar_id=$1
         AND dia=$2
         AND activo=true
         AND id != $3
         AND NOT (hora_fin <= $4 OR hora_inicio >= $5)
         AND ($6::varchar IS NULL OR tipo_cancha IS NULL OR tipo_cancha = $6)`,
      [lugar_id, dia, id, hora_inicio, hora_fin, tipo_cancha || null]
    );

    if (existe.rows.length > 0) {
      if (tipo_cancha && existe.rows[0].tipo_cancha === tipo_cancha) {
        return res.status(400).json({
          error: `Ya existe una cancha ${tipo_cancha} que se cruza con ese horario. Cambia la hora o el tipo de cancha.`
        });
      }

      return res.status(400).json({
        error: 'Ya existe un horario que se cruza con ese rango de horas'
      });
    }

    await pool.query(
      `UPDATE horarios_plantilla
      SET hora_inicio=$1,
          hora_fin=$2,
          cupos=$3,
          activo=$4,
          tipo_cancha=$5,
          instructor=$6,
          descripcion=$7
      WHERE id=$8`,
      [
        hora_inicio,
        hora_fin,
        cupos,
        activo,
        tipo_cancha || null,
        instructor?.trim() || null,
        descripcion?.trim() || null,
        id
      ]
    );

    res.json({ mensaje: 'Horario actualizado' });
  } catch (err) {
    console.error('Error al editar horario:', err);
    res.status(500).json({ error: 'Error al editar horario' });
  }
});

router.delete('/horarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const horario = await pool.query('SELECT * FROM horarios_plantilla WHERE id=$1', [id]);
    if (horario.rows.length > 0) {
      const h = horario.rows[0];
      if (!validarTiempoMinimo(h.dia, h.hora_inicio)) {
        return res.status(400).json({
          error: 'No puedes eliminar un horario con menos de 24 horas de anticipación'
        });
      }
    }
    const reservas = await pool.query(
      `SELECT COUNT(*) FROM reservas r 
       WHERE r.horario_id = $1 AND r.fecha >= CURRENT_DATE`,
      [id]
    );
    if (parseInt(reservas.rows[0].count) > 0) {
      return res.status(400).json({
        error: `No puedes eliminar este horario porque tiene ${reservas.rows[0].count} reserva(s) activa(s). Debes esperar a que pasen para poder eliminarlo.`
      });
    }
    // Borrar en cadena: penalizaciones → asistencia → reservas → horario
    await pool.query(`
      DELETE FROM penalizaciones WHERE asistencia_id IN (
        SELECT a.id FROM asistencia a
        JOIN reservas r ON a.reserva_id = r.id
        WHERE r.horario_id = $1
      )
    `, [id]);
    await pool.query('DELETE FROM asistencia WHERE reserva_id IN (SELECT id FROM reservas WHERE horario_id = $1)', [id]);
    await pool.query('DELETE FROM reservas WHERE horario_id = $1', [id]);
    await pool.query('DELETE FROM horarios_plantilla WHERE id = $1', [id]);
    res.json({ mensaje: 'Horario eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar horario' });
  }
});

router.post('/horarios/copiar', async (req, res) => {
  try {
    const { lugar_id, horarios_ids, dias_destino } = req.body;
    const horariosOrigen = await pool.query(
      'SELECT * FROM horarios_plantilla WHERE id = ANY($1)',
      [horarios_ids]
    );
    const errores = [];
    const copiados = [];
    for (const dia of dias_destino) {
      for (const h of horariosOrigen.rows) {
        if (!validarTiempoMinimo(dia, h.hora_inicio)) {
          errores.push(
            `No se puede copiar ${h.hora_inicio.slice(0, 5)}-${h.hora_fin.slice(0, 5)} a ${dia} porque faltan menos de 24 horas para su inicio`
          );
          continue;
        }
        const existe = await pool.query(
          `SELECT id FROM horarios_plantilla 
           WHERE lugar_id=$1 AND dia=$2 AND activo=true
           AND NOT (hora_fin <= $3 OR hora_inicio >= $4)
           AND ($5::varchar IS NULL OR tipo_cancha IS NULL OR tipo_cancha = $5)`,
          [lugar_id, dia, h.hora_inicio, h.hora_fin, h.tipo_cancha || null]
        );
        if (existe.rows.length > 0) {
          errores.push(`Ya existe un horario en ${dia} que se cruza con ${h.hora_inicio.slice(0,5)}-${h.hora_fin.slice(0,5)}`);
        } else {
          await pool.query(
            `INSERT INTO horarios_plantilla
            (lugar_id, dia, hora_inicio, hora_fin, cupos, tipo_cancha, instructor, descripcion, activo)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)`,
            [
              lugar_id,
              dia,
              h.hora_inicio,
              h.hora_fin,
              h.cupos,
              h.tipo_cancha || null,
              h.instructor || null,
              h.descripcion || null
            ]
          );
          copiados.push(dia);
        }
      }
    }
    if (errores.length > 0 && copiados.length === 0) {
      return res.status(400).json({ error: errores.join(', ') });
    }
    res.status(201).json({ mensaje: 'Horarios copiados correctamente', errores });
  } catch (err) {
    res.status(500).json({ error: 'Error al copiar horarios' });
  }
});

router.post('/excepciones', async (req, res) => {
  try {
    const { lugar_id, fecha, horarios, cerrado, motivo } = req.body;

    if (cerrado) {
      const ahora = obtenerAhoraEcuador();

      const [year, month, day] = String(fecha).slice(0, 10).split('-');

      const fechaObjetivo = new Date(Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        0,
        0,
        0
      ));

      const diferenciaHoras =
        (fechaObjetivo - ahora) / (1000 * 60 * 60);

      if (diferenciaHoras < 24) {
        return res.status(400).json({
          error: 'No puedes cerrar un día con menos de 24 horas de anticipación'
        });
      }
    } else if (horarios?.length > 0) {
      for (const h of horarios) {
        if (!validarFechaHoraMinima(fecha, h.hora_inicio)) {
          return res.status(400).json({
            error: 'No puedes crear un día especial con menos de 24 horas de anticipación'
          });
        }
      }
    }

    await pool.query('DELETE FROM horarios_excepciones WHERE lugar_id=$1 AND fecha=$2', [lugar_id, fecha]);

    if (cerrado) {
      await pool.query(
        'INSERT INTO horarios_excepciones (lugar_id, fecha, cerrado, motivo) VALUES ($1, $2, true, $3)',
        [lugar_id, fecha, motivo]
      );
    } else if (horarios && horarios.length > 0) {
      for (const h of horarios) {
        if (!h.hora_inicio || !h.hora_fin || !h.cupos) {
          return res.status(400).json({ error: 'Todos los horarios deben tener hora inicio, fin y cupos' });
        }
        if (h.hora_fin <= h.hora_inicio) {
          return res.status(400).json({ error: 'La hora de fin debe ser mayor que la hora de inicio' });
        }
      }
      for (const h of horarios) {
        await pool.query(
          `INSERT INTO horarios_excepciones
          (lugar_id, fecha, hora_inicio, hora_fin, cupos, cerrado, motivo, instructor, descripcion)
          VALUES ($1, $2, $3, $4, $5, false, $6, $7, $8)`,
          [
            lugar_id,
            fecha,
            h.hora_inicio,
            h.hora_fin,
            h.cupos,
            motivo,
            h.instructor?.trim() || null,
            h.descripcion?.trim() || null
          ]
        );
      }
    } else {
      return res.status(400).json({ error: 'Debes elegir cerrado o agregar al menos un horario' });
    }

    const reservasAfectadas = await pool.query(
      `SELECT r.id, r.usuario_id, h.hora_inicio, l.nombre AS lugar_nombre
       FROM reservas r
       JOIN horarios_plantilla h ON r.horario_id = h.id
       JOIN lugares l ON h.lugar_id = l.id
       WHERE h.lugar_id = $1 AND r.fecha::date = $2::date`,
      [lugar_id, fecha]
    );

    if (reservasAfectadas.rows.length > 0) {
      const fechaTexto = new Date(fecha + 'T00:00:00').toLocaleDateString('es-EC');
      const razon = motivo ? ` (${motivo})` : '';

      for (const r of reservasAfectadas.rows) {
        const mensaje = cerrado
          ? `Tu reserva del ${fechaTexto} en "${r.lugar_nombre}" fue cancelada porque el lugar permanecerá cerrado ese día${razon}.`
          : `El horario del ${fechaTexto} en "${r.lugar_nombre}" cambió${razon}. Tu reserva fue cancelada, por favor revisa los nuevos horarios y vuelve a reservar.`;

        await pool.query(
          'INSERT INTO notificaciones (usuario_id, mensaje) VALUES ($1, $2)',
          [r.usuario_id, mensaje]
        );
      }

      await pool.query(
        `DELETE FROM reservas
         WHERE fecha::date = $1::date
         AND horario_id IN (SELECT id FROM horarios_plantilla WHERE lugar_id = $2)`,
        [fecha, lugar_id]
      );
    }

    res.status(201).json({
      mensaje: 'Dia especial guardado correctamente',
      reservas_canceladas: reservasAfectadas.rows.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar dia especial' });
  }
});

router.get('/excepciones/:lugar_id', async (req, res) => {
  try {
    const { lugar_id } = req.params;
    const result = await pool.query(
      'SELECT * FROM horarios_excepciones WHERE lugar_id = $1 AND fecha >= CURRENT_DATE ORDER BY fecha ASC, hora_inicio ASC',
      [lugar_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener excepciones' });
  }
});

router.delete('/excepciones/:lugar_id/:fecha', async (req, res) => {
  try {
    const { lugar_id, fecha } = req.params;

    const fechaExcepcion = new Date(fecha + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const yaPaso = fechaExcepcion <= hoy;

    if (yaPaso) {
      await pool.query(
        `DELETE FROM reservas WHERE excepcion_id IN (
          SELECT id FROM horarios_excepciones WHERE lugar_id=$1 AND fecha::date=$2::date
        )`,
        [lugar_id, fecha]
      );
      await pool.query('DELETE FROM horarios_excepciones WHERE lugar_id=$1 AND fecha=$2', [lugar_id, fecha]);
      return res.json({ mensaje: 'Dia especial eliminado' });
    }

    const reservas = await pool.query(
      `SELECT COUNT(*) FROM reservas r
       JOIN horarios_excepciones e ON r.excepcion_id = e.id
       WHERE e.lugar_id = $1 AND e.fecha::date = $2::date`,
      [lugar_id, fecha]
    );
    if (parseInt(reservas.rows[0].count) > 0) {
      return res.status(400).json({
        error: `No puedes eliminar este día especial porque tiene ${reservas.rows[0].count} reserva(s) activa(s). Cancela primero las reservas desde la sección de inscritos.`
      });
    }

    await pool.query('DELETE FROM horarios_excepciones WHERE lugar_id=$1 AND fecha=$2', [lugar_id, fecha]);
    res.json({ mensaje: 'Dia especial eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// EDITAR UN HORARIO ESPECIAL INDIVIDUAL
router.put('/excepcion/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      hora_inicio,
      hora_fin,
      cupos,
      instructor,
      descripcion
    } = req.body;

    if (hora_fin <= hora_inicio) {
      return res.status(400).json({
        error: 'La hora de fin debe ser mayor que la hora de inicio'
      });
    }

    if (!cupos || cupos < 1) {
      return res.status(400).json({
        error: 'Los cupos deben ser al menos 1'
      });
    }

    const actual = await pool.query(
      'SELECT fecha FROM horarios_excepciones WHERE id=$1',
      [id]
    );

    if (actual.rows.length === 0) {
      return res.status(404).json({
        error: 'Horario especial no encontrado'
      });
    }

    const { fecha } = actual.rows[0];

    if (!validarFechaHoraMinima(fecha, hora_inicio)) {
      return res.status(400).json({
        error: 'No puedes editar un horario especial con menos de 24 horas de anticipación'
      });
    }

    await pool.query(
      `UPDATE horarios_excepciones
      SET hora_inicio=$1,
          hora_fin=$2,
          cupos=$3,
          instructor=$4,
          descripcion=$5
      WHERE id=$6`,
      [
        hora_inicio,
        hora_fin,
        cupos,
        instructor?.trim() || null,
        descripcion?.trim() || null,
        id
      ]
    );

    res.json({
      mensaje: 'Horario especial actualizado'
    });
  } catch (err) {
    console.error('Error al actualizar horario especial:', err);
    res.status(500).json({
      error: 'Error al actualizar horario especial'
    });
  }
});

// ELIMINAR UN HORARIO ESPECIAL INDIVIDUAL
router.delete('/excepcion/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const excepcion = await pool.query(
      'SELECT fecha, hora_inicio FROM horarios_excepciones WHERE id = $1',
      [id]
    );

    if (excepcion.rows.length === 0) {
      return res.status(404).json({
        error: 'Horario especial no encontrado'
      });
    }

    const { fecha, hora_inicio } = excepcion.rows[0];

    if (!validarFechaHoraMinima(fecha, hora_inicio)) {
      return res.status(400).json({
        error: 'No puedes eliminar un horario especial con menos de 24 horas de anticipación'
      });
    }

    const reservas = await pool.query(
      'SELECT COUNT(*) FROM reservas WHERE excepcion_id = $1',
      [id]
    );

    if (parseInt(reservas.rows[0].count) > 0) {
      return res.status(400).json({
        error: `No puedes eliminar este horario especial porque tiene ${reservas.rows[0].count} reserva(s) activa(s). Cancela primero las reservas desde la sección de inscritos.`
      });
    }

    await pool.query(
      'DELETE FROM horarios_excepciones WHERE id = $1',
      [id]
    );

    res.json({
      mensaje: 'Horario especial eliminado'
    });
  } catch (err) {
    console.error('Error al eliminar horario especial:', err);
    res.status(500).json({
      error: 'Error al eliminar horario especial'
    });
  }
});

module.exports = router;