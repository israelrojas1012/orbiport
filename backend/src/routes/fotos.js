const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { upload, eliminarImagen } = require('../cloudinary');


const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// SUBIR FOTO
router.post('/:lugar_id', upload.single('foto'), async (req, res) => {
  try {
    const { lugar_id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No se subio ninguna imagen' });
    const url = req.file.path;
    const public_id = req.file.filename;
    const orden = await pool.query('SELECT COALESCE(MAX(orden), 0) + 1 as siguiente FROM fotos_lugares WHERE lugar_id = $1', [lugar_id]);
    const result = await pool.query(
      'INSERT INTO fotos_lugares (lugar_id, url, public_id, orden) VALUES ($1, $2, $3, $4) RETURNING *',
      [lugar_id, url, public_id, orden.rows[0].siguiente]
    );
    // Si es la primera foto, ponerla como foto_url principal
    const total = await pool.query('SELECT COUNT(*) FROM fotos_lugares WHERE lugar_id = $1', [lugar_id]);
    if (parseInt(total.rows[0].count) === 1) {
      await pool.query('UPDATE lugares SET foto_url = $1 WHERE id = $2', [url, lugar_id]);
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al subir foto' });
  }
});

// OBTENER FOTOS DE UN LUGAR
router.get('/:lugar_id', async (req, res) => {
  try {
    const { lugar_id } = req.params;
    const result = await pool.query(
      'SELECT * FROM fotos_lugares WHERE lugar_id = $1 ORDER BY orden ASC, id ASC',
      [lugar_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener fotos' });
  }
});

// ELIMINAR FOTO
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const foto = await pool.query('SELECT public_id, url, lugar_id FROM fotos_lugares WHERE id = $1', [id]);
    if (foto.rows.length === 0) return res.status(404).json({ error: 'Foto no encontrada' });
    const { public_id, url, lugar_id } = foto.rows[0];
    await eliminarImagen(public_id);
    await pool.query('DELETE FROM fotos_lugares WHERE id = $1', [id]);
    // Si era la foto principal, usar la siguiente o limpiar
    const lugarFoto = await pool.query('SELECT foto_url FROM lugares WHERE id = $1', [lugar_id]);
    if (lugarFoto.rows[0]?.foto_url === url) {
      const siguiente = await pool.query('SELECT url FROM fotos_lugares WHERE lugar_id = $1 ORDER BY orden ASC LIMIT 1', [lugar_id]);
      const nuevaUrl = siguiente.rows[0]?.url || null;
      await pool.query('UPDATE lugares SET foto_url = $1 WHERE id = $2', [nuevaUrl, lugar_id]);
    }
    res.json({ mensaje: 'Foto eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar foto' });
  }
});

// REORDENAR FOTOS
router.put('/orden', async (req, res) => {
  try {
    const { fotos } = req.body;

    if (!Array.isArray(fotos) || fotos.length === 0) {
      return res.status(400).json({ error: 'No se recibió un orden válido' });
    }

    const lugarIdResult = await pool.query(
      'SELECT lugar_id FROM fotos_lugares WHERE id = $1',
      [fotos[0].id]
    );

    if (lugarIdResult.rows.length === 0) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }

    const lugar_id = lugarIdResult.rows[0].lugar_id;

    for (let i = 0; i < fotos.length; i++) {
      await pool.query(
        'UPDATE fotos_lugares SET orden = $1 WHERE id = $2 AND lugar_id = $3',
        [i + 1, fotos[i].id, lugar_id]
      );
    }

    // La foto en posición 1 se convierte en portada
    await pool.query(
      'UPDATE lugares SET foto_url = $1 WHERE id = $2',
      [fotos[0].url, lugar_id]
    );

    res.json({
      mensaje: 'Orden de fotos actualizado',
      portada: fotos[0].url
    });

  } catch (err) {
    console.error('Error al reordenar fotos:', err);
    res.status(500).json({ error: 'Error al reordenar fotos' });
  }
});

module.exports = router;
