 
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

// OBTENER TODOS LOS LUGARES
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lugares ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener lugares' });
  }
});

// OBTENER HORARIOS PUBLICOS DE UN LUGAR

router.get('/:id/horarios', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM horarios_plantilla
       WHERE lugar_id = $1
       ORDER BY
         CASE dia
           WHEN 'Lunes' THEN 1
           WHEN 'Martes' THEN 2
           WHEN 'Miércoles' THEN 3
           WHEN 'Jueves' THEN 4
           WHEN 'Viernes' THEN 5
           WHEN 'Sábado' THEN 6
           WHEN 'Domingo' THEN 7
         END,
         hora_inicio ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('ERROR AL OBTENER HORARIOS:', err);
    res.status(500).json({
      error: 'Error al obtener horarios'
    });
  }
});

// OBTENER UN LUGAR POR ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const lugar = await pool.query('SELECT * FROM lugares WHERE id = $1', [id]);
    const horarios = await pool.query('SELECT * FROM horarios WHERE lugar_id = $1', [id]);
    res.json({ ...lugar.rows[0], horarios: horarios.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el lugar' });
  }
});

module.exports = router;