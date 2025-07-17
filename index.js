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

// Webhook de entrada de mensagens do WhatsApp
app.post('/webhook', (req, res) => {
  const entry = req.body.entry?.[0];
  const change = entry?.changes?.[0];
  const msg = change?.value?.messages?.[0];

  if (msg && msg.from) {
    const from = msg.from;
    let text = '';

    if (msg.text?.body) {
      text = msg.text.body;
    } else if (msg.button?.payload) {
      text = msg.button.payload; // ideal se você usa payload nos botões
    } else if (msg.button?.text) {
      text = msg.button.text; // fallback caso payload não esteja configurado
    }

    if (!text) {
      console.log('⚠️ Mensagem recebida sem texto nem botão, ignorada');
      return res.sendStatus(200);
    }

    const timestamp = new Date().toISOString();

    if (!mensagens[from]) {
      mensagens[from] = [];
    }

    mensagens[from].push({
      from: 'cliente',
      msg: text,
      timestamp
    });

    console.log(`📩 Mensagem recebida de ${from}: ${text}`);

    axios.post('https://hook.us2.make.com/fsk7p1m16g46tzt7mpi8kbmlhbucy93y', {
      numero: from.startsWith('+') ? from : `+${from}`,
      mensagem: text,
      origem: 'cliente'
    })
    .then(() => console.log('✅ Enviado ao Make com sucesso'))
    .catch((err) => console.error('❌ Erro ao enviar para Make:', err.response?.data || err.message));
  }

  res.sendStatus(200);
});

// Retorna o histórico de mensagens (para o painel)
app.get('/messages', (req, res) => {
  res.json(mensagens);
});

// Envio de mensagens via API
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
    console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Página inicial
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Servidor rodando na porta', PORT);
});
