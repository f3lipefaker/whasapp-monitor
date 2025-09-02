import express from 'express';
import bodyParser from 'body-parser';
import { pool } from './utils/db.js';
import cors from 'cors';

const app = express();
const PORT = 9000;

app.use(bodyParser.json());
app.use(cors());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});


// 📌 [1] Buscar último chamado de um número
app.get('/api/chamados/:numero', async (req, res) => {
  try {
    const { numero } = req.params;

    console.log(req.params);
    
    const result = await pool.query(
      'SELECT * FROM chamados WHERE numero = $1 ORDER BY atualizado_em DESC LIMIT 1',
      [numero]
    );

    if (!result.rows[0]) {
      return res.json({ status: 'finalizado' }); // nunca teve chamado → tratar como finalizado
    }

    res.json(result.rows[0]); // retorna {id, numero, status, ...}
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 📌 [2] Abrir chamado somente quando há interação
app.post('/api/chamados/abrir', async (req, res) => {
  try {
    const { numero } = req.body;

    // Busca o último chamado
    const result = await pool.query(
      'SELECT * FROM chamados WHERE numero = $1 ORDER BY atualizado_em DESC LIMIT 1',
      [numero]
    );
    const ultimo = result.rows[0];

    // Se não existe ou está finalizado → cria novo
    if (!ultimo || ultimo.status === 'finalizado') {
      const insert = await pool.query(
        'INSERT INTO chamados (numero, status, criado_em, atualizado_em) VALUES ($1, $2, NOW(), NOW()) RETURNING *',
        [numero, 'aberto']
      );
      return res.json(insert.rows[0]);
    }

    // Já existe um aberto → retorna ele
    res.json(ultimo);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 📌 [3] Finalizar chamado (último aberto)
app.post('/api/chamados/finalizar', async (req, res) => {
  try {
    const { numero } = req.body;

    const row = await pool.query(
      `UPDATE chamados
         SET status = 'finalizado', atualizado_em = NOW()
       WHERE id = (
         SELECT id FROM chamados
          WHERE numero = $1 AND status = 'aberto'
          ORDER BY atualizado_em DESC LIMIT 1
       )
       RETURNING *`,
      [numero]
    );

    if (row.rowCount === 0) {
      return res.json({ message: 'Nenhum chamado aberto para finalizar' });
    }

    res.json({ message: 'Chamado finalizado com sucesso', chamado: row.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 🚀 Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
