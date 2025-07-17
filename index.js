const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

let mensagens = {};

function salvarMensagem(numero, from, msg, timestamp = Date.now()) {
  if (!mensagens[numero]) mensagens[numero] = [];
  mensagens[numero].push({ from, msg, timestamp });
}

// Lista todas as mensagens no painel
app.get('/messages', (req, res) => {
  res.json(mensagens);
});

// Envia mensagem para número específico (painel manual)
app.post('/send', async (req, res) => {
  const { to, text } = req.body;

  try {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

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
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    salvarMensagem(to, 'Você', text);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Recebe mensagens do WhatsApp (webhook)
app.post('/webhook', async (req, res) => {
  const entry = req.body.entry?.[0];
  const changes = entry?.changes?.[0];
  const message = changes?.value?.messages?.[0];
  const contact = changes?.value?.contacts?.[0];

  if (message && contact) {
    const numero = contact.wa_id;
    const texto = message.text?.body;

    if (texto) {
      salvarMensagem(numero, 'Cliente', texto, Number(message.timestamp) * 1000);
      console.log(`Mensagem recebida de ${numero}: ${texto}`);

      // Envia para o Chatwoot
      try {
        await axios.post(
          `https://app.chatwoot.com/api/v1/inboxes/${process.env.CHATWOOT_INBOX_ID}/messages`,
          {
            content: texto,
            inbox_id: Number(process.env.CHATWOOT_INBOX_ID),
            message_type: 'incoming',
            sender: {
              name: numero,
              identifier: numero
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'api_access_token': process.env.CHATWOOT_API_TOKEN
            }
          }
        );
      } catch (err) {
        console.error('Erro ao enviar para Chatwoot:', err.response?.data || err.message);
      }
    }
  }

  res.sendStatus(200);
});

// Verificação do webhook
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'meuverificawhatsapp';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK VERIFICADO');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ Nova rota: Recebe mensagens do Chatwoot e envia pelo WhatsApp
app.post('/chatwoot/webhook', async (req, res) => {
  const payload = req.body;

  const message = payload?.content;
  const numero = payload?.inbox?.custom_attributes?.phone;

  if (!message || !numero) {
    console.log('⚠️ Mensagem ou número ausente:', { message, numero });
    return res.status(400).send('Faltando número ou conteúdo');
  }

  try {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: numero,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Mensagem enviada via WhatsApp pelo Chatwoot:', response.data);
    salvarMensagem(numero, 'Você (Chatwoot)', message);
    res.sendStatus(200);
  } catch (err) {
    console.error('Erro ao enviar mensagem via WhatsApp:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
