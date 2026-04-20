const jwt = require('jsonwebtoken');

function autenticarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Token não fornecido' });

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
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

module.exports = { autenticarToken, autorizarCargo };