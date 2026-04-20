const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = (pool) => {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    const { username, senha } = req.body;

    try {
      const result = await pool.query(
        'SELECT * FROM usuarios WHERE username = $1',
        [username]
      );

      if (!result.rows.length)
        return res.status(401).json({ message: 'Usuário não encontrado' });

      const usuario = result.rows[0];

      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida)
        return res.status(401).json({ message: 'Senha incorreta' });

      const token = jwt.sign(
        { id: usuario.id, cargo: usuario.cargo, loja_id: usuario.loja_id },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({ token });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  return router;
};