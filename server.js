const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get("/api/transferencias", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM transferencias ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/transferencias", async (req, res) => {
  const { data, origem, destino, motorista, valor_mercadoria, valor_frete } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO transferencias (data, origem, destino, motorista, valor_mercadoria, valor_frete)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data, origem, destino, motorista, valor_mercadoria, valor_frete]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
