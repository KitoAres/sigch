// backend/routes/psicologos.js
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

// GET /api/psicologos
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, u.email, u.rol
      FROM psicologos p
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      ORDER BY p.id_psicologo
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/psicologos/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, u.email, u.rol
      FROM psicologos p
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      WHERE p.id_psicologo = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Psicólogo no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/psicologos
router.post('/', async (req, res) => {
  const { id_usuario, nombre_completo, especialidad, registro_profesional } = req.body;
  if (!id_usuario || !nombre_completo || !especialidad || !registro_profesional) {
    return res.status(400).json({ error: 'id_usuario, nombre_completo, especialidad y registro_profesional son obligatorios' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO psicologos (id_usuario, nombre_completo, especialidad, registro_profesional) VALUES (?, ?, ?, ?)',
      [id_usuario, nombre_completo, especialidad, registro_profesional]
    );
    res.status(201).json({ id_psicologo: result.insertId, message: 'Psicólogo registrado exitosamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El registro profesional ya existe' });
    if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'El id_usuario no existe' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/psicologos/:id
router.put('/:id', async (req, res) => {
  const { nombre_completo, especialidad, registro_profesional, activo } = req.body;
  try {
    const fields = [];
    const values = [];
    if (nombre_completo !== undefined)        { fields.push('nombre_completo = ?');        values.push(nombre_completo); }
    if (especialidad !== undefined)           { fields.push('especialidad = ?');           values.push(especialidad); }
    if (registro_profesional !== undefined)   { fields.push('registro_profesional = ?');   values.push(registro_profesional); }
    if (activo !== undefined)                 { fields.push('activo = ?');                 values.push(activo); }
    if (!fields.length) return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    values.push(req.params.id);
    await pool.query(`UPDATE psicologos SET ${fields.join(', ')} WHERE id_psicologo = ?`, values);
    res.json({ message: 'Psicólogo actualizado exitosamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El registro profesional ya existe' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/psicologos/:id — eliminación lógica
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE psicologos SET activo = 0 WHERE id_psicologo = ?', [req.params.id]);
    res.json({ message: 'Psicólogo desactivado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
