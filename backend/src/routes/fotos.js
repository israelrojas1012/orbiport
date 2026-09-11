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

    if (!req.file) {
      return res.status(400).json({
        error: 'No se subió ninguna imagen'
      });
    }

    const url = req.file.path;
    const public_id = req.file.filename;

    // La nueva foto se coloca al final
    const ordenResult = await pool.query(
      `SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente
       FROM fotos_lugares
       WHERE lugar_id = $1`,
      [lugar_id]
    );

    const orden = ordenResult.rows[0].siguiente;

    const result = await pool.query(
      `INSERT INTO fotos_lugares
       (lugar_id, url, public_id, orden)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [lugar_id, url, public_id, orden]
    );

    // Si es la primera foto, convertirla en portada
    if (orden === 1) {
      await pool.query(
        `UPDATE lugares
         SET foto_url = $1
         WHERE id = $2`,
        [url, lugar_id]
      );
    }

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('ERROR AL SUBIR FOTO:', err);

    res.status(500).json({
      error: 'Error al subir foto'
    });
  }
});

// OBTENER FOTOS DE UN LUGAR
  
router.get('/:lugar_id', async (req, res) => {
  try {
    const { lugar_id } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM fotos_lugares
       WHERE lugar_id = $1
       ORDER BY orden ASC, id ASC`,
      [lugar_id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error('ERROR AL OBTENER FOTOS:', err);

    res.status(500).json({
      error: 'Error al obtener fotos'
    });
  }
});
  
// ELIMINAR FOTO
  
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const fotoResult = await pool.query(
      `SELECT public_id, url, lugar_id
       FROM fotos_lugares
       WHERE id = $1`,
      [id]
    );

    if (fotoResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Foto no encontrada'
      });
    }

    const foto = fotoResult.rows[0];

    // Eliminar de Cloudinary
    await eliminarImagen(foto.public_id);

    // Eliminar de la base
    await pool.query(
      `DELETE FROM fotos_lugares
       WHERE id = $1`,
      [id]
    );

    // Reorganizar automáticamente las posiciones
    const fotosRestantes = await pool.query(
      `SELECT id, url
       FROM fotos_lugares
       WHERE lugar_id = $1
       ORDER BY orden ASC, id ASC`,
      [foto.lugar_id]
    );

    for (let i = 0; i < fotosRestantes.rows.length; i++) {
      await pool.query(
        `UPDATE fotos_lugares
         SET orden = $1
         WHERE id = $2`,
        [i + 1, fotosRestantes.rows[i].id]
      );
    }

    // La primera foto restante pasa a ser portada
    const nuevaPortada = fotosRestantes.rows[0]?.url || null;

    await pool.query(
      `UPDATE lugares
       SET foto_url = $1
       WHERE id = $2`,
      [nuevaPortada, foto.lugar_id]
    );

    res.json({
      mensaje: 'Foto eliminada',
      portada: nuevaPortada
    });

  } catch (err) {
    console.error('ERROR AL ELIMINAR FOTO:', err);

    res.status(500).json({
      error: 'Error al eliminar foto'
    });
  }
});
  
// REORDENAR FOTOS
  
router.put('/orden', async (req, res) => {
  try {
    const { fotos } = req.body;

    if (!Array.isArray(fotos) || fotos.length === 0) {
      return res.status(400).json({
        error: 'No se recibió un orden válido'
      });
    }

    // Obtener el lugar al que pertenecen las fotos
    const primeraFoto = await pool.query(
      `SELECT lugar_id
       FROM fotos_lugares
       WHERE id = $1`,
      [fotos[0].id]
    );

    if (primeraFoto.rows.length === 0) {
      return res.status(404).json({
        error: 'Foto no encontrada'
      });
    }

    const lugar_id = primeraFoto.rows[0].lugar_id;

    // Verificar que todas las fotos pertenezcan al mismo lugar
    for (const foto of fotos) {
      const verificar = await pool.query(
        `SELECT id
         FROM fotos_lugares
         WHERE id = $1
         AND lugar_id = $2`,
        [foto.id, lugar_id]
      );

      if (verificar.rows.length === 0) {
        return res.status(400).json({
          error: 'Una de las fotos no pertenece a este lugar'
        });
      }
    }

    // Guardar nuevo orden
    for (let i = 0; i < fotos.length; i++) {
      await pool.query(
        `UPDATE fotos_lugares
         SET orden = $1
         WHERE id = $2
         AND lugar_id = $3`,
        [i + 1, fotos[i].id, lugar_id]
      );
    }

    // La foto número 1 siempre es la portada
    await pool.query(
      `UPDATE lugares
       SET foto_url = $1
       WHERE id = $2`,
      [fotos[0].url, lugar_id]
    );

    res.json({
      mensaje: 'Orden de fotos actualizado',
      portada: fotos[0].url
    });

  } catch (err) {
    console.error('ERROR AL REORDENAR FOTOS:', err);

    res.status(500).json({
      error: 'Error al reordenar fotos'
    });
  }
});

module.exports = router;