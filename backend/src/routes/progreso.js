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

// =====================================================
// OBTENER CATALOGO DE EJERCICIOS
// =====================================================
router.get('/ejercicios', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        nombre,
        nombre_es,
        categoria,
        alias_busqueda
      FROM ejercicios
      WHERE activo = TRUE
      ORDER BY nombre ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener ejercicios:', err);
    res.status(500).json({
      error: 'Error al obtener ejercicios'
    });
  }
});

// =====================================================
// OBTENER HISTORIAL DE UN USUARIO
// =====================================================
router.get('/usuario/:usuario_id', verificarToken, async (req, res) => {
  try {
    const usuario_id = req.usuario.id;

    const result = await pool.query(`
      SELECT
        p.id,
        p.usuario_id,
        p.ejercicio_id,
        e.nombre AS ejercicio,
        e.nombre_es AS ejercicio_es,
        e.categoria,
        p.peso,
        p.unidad_peso,
        p.repeticiones,
        p.distancia,
        p.unidad_distancia,
        p.tiempo_segundos,
        p.creado_en
      FROM progresos p
      INNER JOIN ejercicios e
        ON e.id = p.ejercicio_id
      WHERE p.usuario_id = $1
      ORDER BY p.creado_en DESC, p.id DESC
    `, [usuario_id]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener progreso:', err);
    res.status(500).json({
      error: 'Error al obtener progreso'
    });
  }
});

// =====================================================
// AGREGAR REGISTRO DE PROGRESO
// =====================================================
router.post('/', verificarToken, async (req, res) => {
  try {
    const usuario_id = req.usuario.id;

    const {
      ejercicio_id,
      peso = null,
      unidad_peso = null,
      repeticiones = null,
      distancia = null,
      unidad_distancia = null,
      tiempo_segundos = null
    } = req.body;

    if (!ejercicio_id) {
      return res.status(400).json({
        error: 'El ejercicio es obligatorio'
      });
    }

    const pesoNumero =
      peso === '' || peso === null
        ? null
        : Number(peso);

    const repeticionesNumero =
      repeticiones === '' || repeticiones === null
        ? null
        : Number(repeticiones);

    const distanciaNumero =
      distancia === '' || distancia === null
        ? null
        : Number(distancia);

    const tiempoNumero =
      tiempo_segundos === '' || tiempo_segundos === null
        ? null
        : Number(tiempo_segundos);

    if (
      pesoNumero === null &&
      repeticionesNumero === null &&
      distanciaNumero === null &&
      tiempoNumero === null
    ) {
      return res.status(400).json({
        error: 'Debes registrar al menos un dato de progreso'
      });
    }

    if (pesoNumero !== null && (Number.isNaN(pesoNumero) || pesoNumero < 0)) {
      return res.status(400).json({
        error: 'El peso no puede ser negativo'
      });
    }

    if (
      repeticionesNumero !== null &&
      (
        !Number.isInteger(repeticionesNumero) ||
        repeticionesNumero <= 0
      )
    ) {
      return res.status(400).json({
        error: 'Las repeticiones deben ser mayores a 0'
      });
    }

    if (
      distanciaNumero !== null &&
      (Number.isNaN(distanciaNumero) || distanciaNumero < 0)
    ) {
      return res.status(400).json({
        error: 'La distancia no puede ser negativa'
      });
    }

    if (
      tiempoNumero !== null &&
      (
        !Number.isInteger(tiempoNumero) ||
        tiempoNumero < 0
      )
    ) {
      return res.status(400).json({
        error: 'El tiempo no puede ser negativo'
      });
    }

    if (
      pesoNumero !== null &&
      !['kg', 'lb'].includes(unidad_peso)
    ) {
      return res.status(400).json({
        error: 'Selecciona kg o lb para el peso'
      });
    }

    if (
      distanciaNumero !== null &&
      !['m', 'km'].includes(unidad_distancia)
    ) {
      return res.status(400).json({
        error: 'Selecciona m o km para la distancia'
      });
    }

    const ejercicio = await pool.query(
      `SELECT id
       FROM ejercicios
       WHERE id = $1
         AND activo = TRUE`,
      [ejercicio_id]
    );

    if (ejercicio.rows.length === 0) {
      return res.status(404).json({
        error: 'Ejercicio no encontrado'
      });
    }

    const result = await pool.query(`
      INSERT INTO progresos (
        usuario_id,
        ejercicio_id,
        peso,
        unidad_peso,
        repeticiones,
        distancia,
        unidad_distancia,
        tiempo_segundos
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      usuario_id,
      ejercicio_id,
      pesoNumero,
      pesoNumero === null ? null : unidad_peso,
      repeticionesNumero,
      distanciaNumero,
      distanciaNumero === null ? null : unidad_distancia,
      tiempoNumero
    ]);

    res.status(201).json({
      mensaje: 'Progreso registrado correctamente',
      progreso: result.rows[0]
    });
  } catch (err) {
    console.error('Error al registrar progreso:', err);

    res.status(500).json({
      error: 'Error al registrar progreso'
    });
  }
});

// =====================================================
// ELIMINAR UN REGISTRO
// =====================================================
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_id = req.usuario.id;

    const result = await pool.query(`
      DELETE FROM progresos
      WHERE id = $1
        AND usuario_id = $2
      RETURNING id
    `, [id, usuario_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Registro no encontrado'
      });
    }

    res.json({
      mensaje: 'Registro eliminado correctamente'
    });
  } catch (err) {
    console.error('Error al eliminar progreso:', err);

    res.status(500).json({
      error: 'Error al eliminar progreso'
    });
  }
});

module.exports = router;