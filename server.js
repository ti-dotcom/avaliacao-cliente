require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// ===============================
// CONFIGURAÇÕES
// ===============================
const SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3000;

if (!SECRET) {
  console.error("❌ JWT_SECRET não definido no .env");
  process.exit(1);
}

// ===============================
// SEGURANÇA
// ===============================
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Muitas requisições. Tente novamente mais tarde." }
}));

app.use(express.json());

app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));

// ===============================
// ARQUIVOS ESTÁTICOS
// ===============================
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login-index.html'));
});

// ===============================
// BANCO DE DADOS
// ===============================
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect()
  .then(() => console.log('✅ Banco conectado'))
  .catch(err => {
    console.error('❌ Erro ao conectar no banco:', err);
    process.exit(1);
  });

// ===============================
// MIDDLEWARE JWT
// ===============================
function autenticarToken(req, res, next) {

  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).json({ message: 'Token não fornecido' });

  const token = authHeader.split(' ')[1];

  jwt.verify(token, SECRET, (err, user) => {

    if (err)
      return res.status(403).json({ message: 'Token inválido' });

    req.user = user;
    next();
  });
}

function autorizarCargo(...cargos) {
  return (req, res, next) => {

    if (!cargos.includes(req.user.cargo)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    next();
  };
}

// ===============================
// LOGIN
// ===============================
app.post('/login', async (req, res) => {

  const { username, senha } = req.body;

  if (!username || !senha)
    return res.status(400).json({ message: 'Username e senha obrigatórios' });

  try {

    const result = await pool.query(
      'SELECT id, username, senha, cargo, loja_id FROM usuarios WHERE username = $1',
      [username]
    );

    if (!result.rows.length)
      return res.status(401).json({ message: 'Usuário não encontrado' });

    const usuario = result.rows[0];

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta)
      return res.status(401).json({ message: 'Senha incorreta' });

    const token = jwt.sign(
      {
        id: usuario.id,
        cargo: usuario.cargo,
        loja_id: usuario.loja_id
      },
      SECRET,
      { expiresIn: '8h' }
    );

    res.json({ success: true, token });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });

  }

});

// ===============================
// ROTAS PÚBLICAS
// ===============================
app.get('/lojas', async (req, res) => {

  try {

    const result = await pool.query(
      'SELECT id, nome FROM lojas ORDER BY nome ASC'
    );

    res.json(result.rows);

  } catch (err) {

    res.status(500).json({ error: 'Erro ao carregar lojas' });

  }

});

app.post('/avaliacoes', async (req, res) => {

  const {
    loja_id,
    nota_atendimento,
    nota_organizacao,
    nota_produtos,
    comentario
  } = req.body;

  if (!loja_id)
    return res.status(400).json({ error: 'Loja inválida' });

  if (
    nota_atendimento < 1 || nota_atendimento > 5 ||
    nota_organizacao < 1 || nota_organizacao > 5 ||
    nota_produtos < 1 || nota_produtos > 5
  ) {
    return res.status(400).json({ error: 'Notas inválidas (1 a 5)' });
  }

  try {

    await pool.query(
      `INSERT INTO avaliacoes
      (loja_id, nota_atendimento, nota_organizacao, nota_produtos, comentario)
      VALUES ($1,$2,$3,$4,$5)`,
      [
        loja_id,
        nota_atendimento,
        nota_organizacao,
        nota_produtos,
        comentario
      ]
    );

    res.json({ success: true });

  } catch (err) {

    res.status(500).json({ error: 'Erro ao salvar avaliação' });

  }

});

// ===============================
// DASHBOARD
// ===============================
app.get(
  '/avaliacoes-detalhadas',
  autenticarToken,
  autorizarCargo('admin', 'gerente'),
  async (req, res) => {

    try {

      let query = `
        SELECT
          a.id,
          a.loja_id,
          l.nome,
          a.nota_atendimento,
          a.nota_organizacao,
          a.nota_produtos,
          a.comentario,
          a.data_avaliacao AS data
        FROM avaliacoes a
        INNER JOIN lojas l
          ON l.id = a.loja_id
      `;

      let params = [];

      if (req.user.cargo === 'gerente') {

        query += ' WHERE l.id = $1';
        params.push(req.user.loja_id);

      }

      query += ' ORDER BY a.data_avaliacao DESC';

      const result = await pool.query(query, params);

      res.json(result.rows);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: 'Erro ao buscar avaliações detalhadas'
      });

    }

  }
);

// ===============================
// CADASTRAR USUÁRIO
// ===============================
app.post(
  '/usuarios',
  autenticarToken,
  autorizarCargo('admin'),
  async (req, res) => {

    const { username, senha, cargo, loja_id } = req.body;

    if (!username || !senha || !cargo)
      return res.status(400).json({
        message: 'Dados obrigatórios não informados'
      });

    try {

      const usuarioExistente = await pool.query(
        'SELECT id FROM usuarios WHERE username = $1',
        [username]
      );

      if (usuarioExistente.rows.length)
        return res.status(400).json({
          message: 'Usuário já existe'
        });

      const senhaHash = await bcrypt.hash(senha, 10);

      await pool.query(
        `INSERT INTO usuarios
        (username, senha, cargo, loja_id)
        VALUES ($1,$2,$3,$4)`,
        [
          username,
          senhaHash,
          cargo,
          loja_id || null
        ]
      );

      res.json({ success: true });

    } catch (err) {

      console.error(err);
      res.status(500).json({
        message: 'Erro ao cadastrar usuário'
      });

    }

  }
);

// ===============================
// LISTAR USUÁRIOS
// ===============================
app.get(
  '/usuarios',
  autenticarToken,
  autorizarCargo('admin'),
  async (req, res) => {

    try {

      const result = await pool.query(
        `SELECT
          u.id,
          u.username,
          u.cargo,
          l.nome AS loja
        FROM usuarios u
        LEFT JOIN lojas l
          ON l.id = u.loja_id
        ORDER BY u.id ASC`
      );

      res.json(result.rows);

    } catch (err) {

      console.error(err);
      res.status(500).json({
        message: 'Erro ao listar usuários'
      });

    }

  }
);

// ===============================
// EXCLUIR USUÁRIO
// ===============================
app.delete(
  '/usuarios/:id',
  autenticarToken,
  autorizarCargo('admin'),
  async (req, res) => {

    const { id } = req.params;

    try {

      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          message: 'Você não pode excluir seu próprio usuário.'
        });
      }

      await pool.query(
        'DELETE FROM usuarios WHERE id = $1',
        [id]
      );

      res.json({ success: true });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        message: 'Erro ao excluir usuário'
      });

    }

  }
);

// ===============================
// ATUALIZAR USUÁRIO
// ===============================
app.put(
  '/usuarios/:id',
  autenticarToken,
  autorizarCargo('admin'),
  async (req, res) => {

    const { id } = req.params;
    const { username, senha, cargo, loja_id } = req.body;

    try {

      if (!username || !cargo)
        return res.status(400).json({
          message: 'Usuário e cargo são obrigatórios.'
        });

      if (parseInt(id) === req.user.id)
        return res.status(400).json({
          message: 'Você não pode alterar seu próprio usuário.'
        });

      await pool.query(
        `UPDATE usuarios
        SET
          username = $1,
          cargo = $2,
          loja_id = $3
        WHERE id = $4`,
        [
          username,
          cargo,
          loja_id || null,
          id
        ]
      );

      if (senha && senha.trim() !== "") {

        const senhaHash = await bcrypt.hash(senha, 10);

        await pool.query(
          'UPDATE usuarios SET senha = $1 WHERE id = $2',
          [senhaHash, id]
        );

      }

      res.json({ success: true });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        message: 'Erro ao atualizar usuário'
      });

    }

  }
);

// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});