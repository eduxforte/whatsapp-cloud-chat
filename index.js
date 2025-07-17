const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Endpoint que recebe mensagens do WhatsApp Cloud
app.post('/webhook', async (req, res) => {
  const entry = req.body.entry?.[0];
  const change = entry?.changes?.[0]?.value;
  const message = change?.messages?.[0];
  const numero = message?.from;
  const texto = message?.text?.body;

  if (numero && texto) {
    try {
      // Envia a mensagem para o Chatwoot
      await axios.post(
  `https://app.chatwoot.com/public/api/v1/inboxes/${process.env.CHATWOOT_INBOX_ID}/contacts/${numero}/conversations`,
  {
    source_id: numero,
    content: texto
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'api_access_token': process.env.CHATWOOT_API_TOKEN
    }
  }
);


      console.log(`Mensagem de ${numero} enviada para o Chatwoot.`);
    } catch (err) {
      console.error('❌ Erro ao enviar para Chatwoot:', err.response?.data || err.message);
    }
  }

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
