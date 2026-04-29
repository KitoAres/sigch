// backend/routes/usuarios.js
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const pool    = require('../config/db');

// GET /api/usuarios — listar todos
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id_usuario, nombre_completo, email, rol, activo, fecha_creacion FROM usuarios ORDER BY id_usuario'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/usuarios/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id_usuario, nombre_completo, email, rol, activo, fecha_creacion FROM usuarios WHERE id_usuario = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/usuarios — crear
router.post('/', async (req, res) => {
  const { nombre_completo, email, contrasena, rol } = req.body;
  if (!nombre_completo || !email || !contrasena || !rol) {
    return res.status(400).json({ error: 'nombre_completo, email, contrasena y rol son obligatorios' });
  }
  const rolesValidos = ['recepcionista', 'psicologo', 'administrador'];
  if (!rolesValidos.includes(rol)) {
    return res.status(400).json({ error: `Rol inválido. Valores permitidos: ${rolesValidos.join(', ')}` });
  }
  try {
    const contrasena_hash = await bcrypt.hash(contrasena, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre_completo, email, contrasena_hash, rol) VALUES (?, ?, ?, ?)',
      [nombre_completo, email, contrasena_hash, rol]
    );
    res.status(201).json({ id_usuario: result.insertId, message: 'Usuario creado exitosamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El email ya está registrado' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/usuarios/:id — actualizar
router.put('/:id', async (req, res) => {
  const { nombre_completo, email, contrasena, rol, activo } = req.body;
  try {
    const fields = [];
    const values = [];
    if (nombre_completo !== undefined) { fields.push('nombre_completo = ?'); values.push(nombre_completo); }
    if (email !== undefined)           { fields.push('email = ?');           values.push(email); }
    if (rol !== undefined)             { fields.push('rol = ?');             values.push(rol); }
    if (activo !== undefined)          { fields.push('activo = ?');          values.push(activo); }
    if (contrasena)                    {
      const hash = await bcrypt.hash(contrasena, 10);
      fields.push('contrasena_hash = ?');
      values.push(hash);
    }
    if (!fields.length) return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    values.push(req.params.id);
    await pool.query(`UPDATE usuarios SET ${fields.join(', ')} WHERE id_usuario = ?`, values);
    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El email ya está registrado' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/usuarios/:id — eliminación lógica
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE usuarios SET activo = 0 WHERE id_usuario = ?', [req.params.id]);
    res.json({ message: 'Usuario desactivado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/usuarios/login — autenticación
router.post('/auth/login', async (req, res) => {
  const { email, contrasena } = req.body;
  if (!email || !contrasena) return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  try {
    const [rows] = await pool.query(
      'SELECT * FROM usuarios WHERE email = ? AND activo = 1', [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });
    const valid = await bcrypt.compare(contrasena, rows[0].contrasena_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });
    const { contrasena_hash, ...user } = rows[0];
    res.json({ message: 'Login exitoso', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
