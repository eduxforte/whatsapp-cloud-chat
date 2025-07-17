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
      // Cria conversa no Chatwoot se necessário
      const conversa = await axios.post(
        `https://app.chatwoot.com/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/conversations`,
        {
          source_id: numero,
          inbox_id: process.env.CHATWOOT_INBOX_ID,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api_access_token': process.env.CHATWOOT_API_TOKEN
          }
        }
      );

      const conversation_id = conversa.data.id;

      // Envia mensagem para a conversa criada
      await axios.post(
        `https://app.chatwoot.com/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/conversations/${conversation_id}/messages`,
        {
          content: texto,
          message_type: 'incoming' // indica que é recebida do cliente
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api_access_token': process.env.CHATWOOT_API_TOKEN
          }
        }
      );

      console.log(`✅ Mensagem de ${numero} enviada para o Chatwoot.`);
    } catch (err) {
      console.error('❌ Erro ao enviar para Chatwoot:', err.response?.data || err.message);
    }
  }

  res.sendStatus(200);
});

// Endpoint GET para verificação do webhook (obrigatório pelo Meta)
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('🔐 Webhook verificado com sucesso!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
