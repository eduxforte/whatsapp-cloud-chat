const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  const entry = req.body.entry?.[0];
  const change = entry?.changes?.[0]?.value;
  const message = change?.messages?.[0];
  const numero = message?.from;
  const texto = message?.text?.body;

  if (numero && texto) {
    try {
      await axios.post(
        `https://app.chatwoot.com/api/v1/accounts/${process.env.ACCOUNT_ID}/conversations`,
        {
          source_id: numero,
          inbox_id: Number(process.env.CHATWOOT_INBOX_ID),
          contact: {
            name: `Cliente ${numero}`
          },
          messages: [
            {
              content: texto,
              message_type: "incoming"
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api_access_token': process.env.CHATWOOT_API_TOKEN
          }
        }
      );

      console.log(`📩 Mensagem de ${numero} enviada ao Chatwoot.`);
    } catch (err) {
      console.error('❌ Erro ao enviar para Chatwoot:', err.response?.data || err.message);
    }
  }

  res.sendStatus(200);
});

app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('🔐 Webhook verificado com sucesso!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
