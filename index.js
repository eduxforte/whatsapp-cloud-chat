const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const token = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Armazena mensagens em memória
const mensagens = {};

app.post('/webhook', (req, res) => {
  const entry = req.body.entry?.[0];
  const change = entry?.changes?.[0];
  const msg = change?.value?.messages?.[0];

  if (msg && msg.from && msg.text?.body) {
    const from = msg.from;
    const text = msg.text.body;
    const timestamp = new Date().toISOString();

    if (!mensagens[from]) {
      mensagens[from] = [];
    }

    mensagens[from].push({
      from: 'cliente',
      msg: text,
      timestamp
    });

    console.log(`Mensagem recebida de ${from}: ${text}`);
  }

  res.sendStatus(200);
});

app.get('/messages', (req, res) => {
  res.json(mensagens);
});

app.post('/send', async (req, res) => {
  const { to, text } = req.body;

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Salva no histórico
    const timestamp = new Date().toISOString();
    if (!mensagens[to]) {
      mensagens[to] = [];
    }
    mensagens[to].push({
      from: 'você',
      msg: text,
      timestamp
    });

    res.sendStatus(200);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor rodando na porta', PORT);
});
