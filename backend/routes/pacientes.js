// backend/routes/pacientes.js
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

// GET /api/pacientes — con búsqueda opcional
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    let sql    = 'SELECT * FROM pacientes';
    const vals = [];
    if (q) {
      sql += ' WHERE (nombre_completo LIKE ? OR ci LIKE ?)';
      vals.push(`%${q}%`, `%${q}%`);
    }
    sql += ' ORDER BY id_paciente';
    const [rows] = await pool.query(sql, vals);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pacientes/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pacientes WHERE id_paciente = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pacientes
router.post('/', async (req, res) => {
  const { nombre_completo, ci, fecha_nacimiento, telefono, email, direccion } = req.body;
  if (!nombre_completo || !ci || !fecha_nacimiento || !telefono) {
    return res.status(400).json({ error: 'nombre_completo, ci, fecha_nacimiento y telefono son obligatorios' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO pacientes (nombre_completo, ci, fecha_nacimiento, telefono, email, direccion) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre_completo, ci, fecha_nacimiento, telefono, email || null, direccion || null]
    );
    res.status(201).json({ id_paciente: result.insertId, message: 'Paciente registrado exitosamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El CI ya está registrado' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/pacientes/:id
router.put('/:id', async (req, res) => {
  const { nombre_completo, ci, fecha_nacimiento, telefono, email, direccion, activo } = req.body;
  try {
    const fields = [];
    const values = [];
    if (nombre_completo !== undefined) { fields.push('nombre_completo = ?');  values.push(nombre_completo); }
    if (ci !== undefined)              { fields.push('ci = ?');               values.push(ci); }
    if (fecha_nacimiento !== undefined){ fields.push('fecha_nacimiento = ?'); values.push(fecha_nacimiento); }
    if (telefono !== undefined)        { fields.push('telefono = ?');         values.push(telefono); }
    if (email !== undefined)           { fields.push('email = ?');            values.push(email); }
    if (direccion !== undefined)       { fields.push('direccion = ?');        values.push(direccion); }
    if (activo !== undefined)          { fields.push('activo = ?');           values.push(activo); }
    if (!fields.length) return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    values.push(req.params.id);
    await pool.query(`UPDATE pacientes SET ${fields.join(', ')} WHERE id_paciente = ?`, values);
    res.json({ message: 'Paciente actualizado exitosamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El CI ya está registrado' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/pacientes/:id — eliminación lógica
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE pacientes SET activo = 0 WHERE id_paciente = ?', [req.params.id]);
    res.json({ message: 'Paciente desactivado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
