require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
console.log('Iniciando o servidor...');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const messagesFile = path.join(__dirname, 'messages.json');

let memoryMessages = {};

// Carrega mensagens do arquivo, ou retorna mensagens em memória se erro
function loadMessages() {
  try {
    if (fs.existsSync(messagesFile)) {
      const data = fs.readFileSync(messagesFile, 'utf-8');
      return data ? JSON.parse(data) : {};
    }
  } catch (err) {
    console.error('⚠️ Não foi possível ler messages.json, usando memória:', err.message);
  }
  return memoryMessages;
}

// Salva mensagens no arquivo, ou guarda na memória se erro
function saveMessages(messages) {
  try {
    fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
    memoryMessages = messages; // atualiza a memória também
  } catch (err) {
    console.error('⚠️ Não foi possível salvar messages.json, mensagens ficarão na memória:', err.message);
    memoryMessages = messages;
  }
}

app.get('/webhook', (req, res) => {
  const verify_token = 'meuverificawhatsapp';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verify_token) {
    console.log('✅ Webhook verificado com sucesso');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.post('/webhook', (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message) {
      const from = message.from;
      const text = message.text?.body || '';

      const allMessages = loadMessages();

      if (!allMessages[from]) allMessages[from] = [];

      allMessages[from].push({ from, msg: text, timestamp: Date.now() });

      saveMessages(allMessages);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro no webhook:', err);
    res.sendStatus(500);
  }
});

app.get('/messages', (req, res) => {
  const messages = loadMessages();
  res.json(messages);
});

app.post('/send', async (req, res) => {
  const axios = require('axios');
  const { to, text } = req.body;

  if (!to || !text) {
    return res.status(400).json({ error: 'Parâmetros "to" e "text" são obrigatórios.' });
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
