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

const validarTiempoMinimo = (dia, hora_inicio) => {
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const ahora = new Date();
  const diaActual = ahora.getDay();
  const diaObjetivo = dias.indexOf(dia);
  let diff = diaObjetivo - diaActual;
  if (diff < 0) diff += 7;
  if (diff === 0) {
    const [h, m] = hora_inicio.split(':');
    const horaObjetivo = new Date();
    horaObjetivo.setHours(parseInt(h), parseInt(m), 0, 0);
    const diff_horas = (horaObjetivo - ahora) / (1000 * 60 * 60);
    if (diff_horas < 2) return false;
  }
  return true;
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
      SELECT i.id, i.estado, i.creado_en,
             u.nombre, u.apellido, u.correo
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
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM inscripciones WHERE id = $1', [id]);
    res.json({ mensaje: 'Inscripcion eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar inscripcion' });
  }
});

router.get('/horarios/:lugar_id', async (req, res) => {
  try {
    const { lugar_id } = req.params;
    const result = await pool.query(
      `SELECT h.*, 
        (SELECT COUNT(*) FROM reservas r WHERE r.horario_id = h.id AND r.fecha >= CURRENT_DATE) as reservados
       FROM horarios_plantilla h 
       WHERE h.lugar_id = $1 
       ORDER BY 
       CASE h.dia 
         WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miércoles' THEN 3 
         WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 WHEN 'Sábado' THEN 6 WHEN 'Domingo' THEN 7 
       END, h.hora_inicio ASC`,
      [lugar_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener horarios' });
  }
});

router.post('/horarios', async (req, res) => {
  try {
    const { lugar_id, dia, hora_inicio, hora_fin, cupos, tipo_cancha } = req.body;
    if (!validarTiempoMinimo(dia, hora_inicio)) {
      return res.status(400).json({ error: 'No puedes crear un horario con menos de 2 horas de anticipacion' });
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
      'INSERT INTO horarios_plantilla (lugar_id, dia, hora_inicio, hora_fin, cupos, tipo_cancha) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [lugar_id, dia, hora_inicio, hora_fin, cupos, tipo_cancha || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al agregar horario' });
  }
});

router.put('/horarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { hora_inicio, hora_fin, cupos, activo, dia, tipo_cancha } = req.body;
    if (!validarTiempoMinimo(dia, hora_inicio)) {
      return res.status(400).json({ error: 'No puedes editar un horario con menos de 2 horas de anticipacion' });
    }
    if (hora_fin <= hora_inicio) {
      return res.status(400).json({ error: 'La hora de fin debe ser mayor que la hora de inicio' });
    }
    const actual = await pool.query('SELECT lugar_id FROM horarios_plantilla WHERE id = $1', [id]);
    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }
    const lugar_id = actual.rows[0].lugar_id;
    const existe = await pool.query(
      `SELECT id, tipo_cancha FROM horarios_plantilla 
       WHERE lugar_id=$1 AND dia=$2 AND activo=true AND id != $3
       AND NOT (hora_fin <= $4 OR hora_inicio >= $5)
       AND ($6::varchar IS NULL OR tipo_cancha IS NULL OR tipo_cancha = $6)`,
      [lugar_id, dia, id, hora_inicio, hora_fin, tipo_cancha || null]
    );
    if (existe.rows.length > 0) {
      if (tipo_cancha && existe.rows[0].tipo_cancha === tipo_cancha) {
        return res.status(400).json({ error: `Ya existe una cancha ${tipo_cancha} que se cruza con ese horario. Cambia la hora o el tipo de cancha.` });
      }
      return res.status(400).json({ error: 'Ya existe un horario que se cruza con ese rango de horas' });
    }
    await pool.query(
      'UPDATE horarios_plantilla SET hora_inicio=$1, hora_fin=$2, cupos=$3, activo=$4, tipo_cancha=$5 WHERE id=$6',
      [hora_inicio, hora_fin, cupos, activo, tipo_cancha || null, id]
    );
    res.json({ mensaje: 'Horario actualizado' });
  } catch (err) {
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
        return res.status(400).json({ error: 'No puedes eliminar un horario con menos de 2 horas de anticipacion' });
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
            'INSERT INTO horarios_plantilla (lugar_id, dia, hora_inicio, hora_fin, cupos, tipo_cancha) VALUES ($1,$2,$3,$4,$5,$6)',
            [lugar_id, dia, h.hora_inicio, h.hora_fin, h.cupos, h.tipo_cancha || null]
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
          'INSERT INTO horarios_excepciones (lugar_id, fecha, hora_inicio, hora_fin, cupos, cerrado, motivo) VALUES ($1, $2, $3, $4, $5, false, $6)',
          [lugar_id, fecha, h.hora_inicio, h.hora_fin, h.cupos, motivo]
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
    const { hora_inicio, hora_fin, cupos } = req.body;
    if (hora_fin <= hora_inicio) {
      return res.status(400).json({ error: 'La hora de fin debe ser mayor que la hora de inicio' });
    }
    if (!cupos || cupos < 1) {
      return res.status(400).json({ error: 'Los cupos deben ser al menos 1' });
    }
    await pool.query(
      'UPDATE horarios_excepciones SET hora_inicio=$1, hora_fin=$2, cupos=$3 WHERE id=$4',
      [hora_inicio, hora_fin, cupos, id]
    );
    res.json({ mensaje: 'Horario especial actualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar horario especial' });
  }
});

// ELIMINAR UN HORARIO ESPECIAL INDIVIDUAL (sin borrar los otros del mismo dia)
router.delete('/excepcion/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const excepcion = await pool.query(
      'SELECT fecha FROM horarios_excepciones WHERE id = $1',
      [id]
    );
    if (excepcion.rows.length === 0) {
      return res.status(404).json({ error: 'Horario especial no encontrado' });
    }

    const fechaExcepcion = new Date(excepcion.rows[0].fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    // <= hoy para que el día de hoy también se pueda eliminar libremente
    const yaPaso = fechaExcepcion <= hoy;

    if (yaPaso) {
      await pool.query('DELETE FROM reservas WHERE excepcion_id = $1', [id]);
      await pool.query('DELETE FROM horarios_excepciones WHERE id = $1', [id]);
      return res.json({ mensaje: 'Horario especial eliminado' });
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

    await pool.query('DELETE FROM horarios_excepciones WHERE id = $1', [id]);
    res.json({ mensaje: 'Horario especial eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar horario especial' });
  }
});

module.exports = router;