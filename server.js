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

// Listar mensagens de um chamado
app.get('/api/chamados/:numero/mensagens', async (req, res) => {
  try {
    const { numero } = req.params;
    const result = await pool.query(
      'SELECT * FROM mensagens WHERE numero = $2 AND status != $1 ORDER BY criado_em ASC',
      ['aberto', numero]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chamados/finalizar', async (req, res) => {
  try {
    const { numero } = req.body;
    console.log(req.body);

    await pool.query(
      'UPDATE chamados SET status = $1, atualizado_em = NOW() WHERE numero = $2 AND status != $1',
      ['finalizado', numero]
    );
    res.json({ message: 'Chamado finalizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar o último chamado de um número
app.get('/api/chamados/:numero', async (req, res) => {
  try {
    const { numero } = req.params;
    const result = await pool.query(
      'SELECT * FROM chamados WHERE numero = $1 ORDER BY atualizado_em DESC LIMIT 1',
      [numero]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar novo chamado
app.post('/api/chamados', async (req, res) => {
  try {
    const { numero } = req.body;
    console.log(req.body);

    const result = await pool.query(
      'INSERT INTO chamados (numero, status, criado_em, atualizado_em) VALUES ($1, $2, NOW(), NOW()) RETURNING *',
      [numero, 'aberto']
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Abrir novo chamado se não houver aberto
app.post('/api/chamados/mensagem-nova', async (req, res) => {
  try {
    const { numero } = req.body;
    
    // Verifica último chamado
    const result = await pool.query(
      'SELECT * FROM chamados WHERE numero = $1 ORDER BY atualizado_em DESC LIMIT 1',
      [numero]
    );

    const ultimo = result.rows[0];
    
    if (!ultimo || ultimo.status === 'finalizado') {
      // Cria novo chamado
      const novo = await pool.query(
        'INSERT INTO chamados (numero, status, criado_em, atualizado_em) VALUES ($1, $2, NOW(), NOW()) RETURNING *',
        [numero, 'aberto']
      );
      return res.json(novo.rows[0]);
    }

    // Se já tiver aberto, retorna ele
    res.json(ultimo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});