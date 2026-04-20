const express = require('express');
const { autenticarToken, autorizarCargo } = require('../middleware/auth');

module.exports = (pool) => {
  const router = express.Router();

  router.get('/avaliacoes-detalhadas', autenticarToken, autorizarCargo('admin','gerente'), async (req,res)=>{
    let query = `
      SELECT l.nome,a.nota_atendimento,a.nota_organizacao,a.nota_produtos,a.comentario
      FROM avaliacoes a
      JOIN lojas l ON l.id=a.loja_id
    `;

    let params=[];

    if(req.user.cargo==='gerente'){
      query+=' WHERE l.id=$1';
      params.push(req.user.loja_id);
    }

    query+=' ORDER BY a.id DESC';

    const result=await pool.query(query,params);
    res.json(result.rows);
  });

  return router;
};