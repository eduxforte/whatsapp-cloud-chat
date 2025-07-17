// 📌 Função para criar contato
async function criarContato(numero) {
  const contato = await axios.post(
    `https://app.chatwoot.com/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/contacts`,
    {
      name: "Cliente WhatsApp",
      phone_number: numero,
      inbox_id: parseInt(process.env.CHATWOOT_INBOX_ID),
      identifier: numero,
      custom_attributes: { via: "whatsapp" }
    },
    {
      headers: {
        "Content-Type": "application/json",
        api_access_token: process.env.CHATWOOT_API_TOKEN
      }
    }
  );

  return contato.data.payload.id;
}

// 📌 Dentro do /webhook
if (numero && texto) {
  try {
    const contatoId = await criarContato(numero);

    await axios.post(
      `https://app.chatwoot.com/api/v1/accounts/${process.env.ACCOUNT_ID}/conversations`,
      {
        source_id: numero,
        inbox_id: parseInt(process.env.CHATWOOT_INBOX_ID),
        contact_id: contatoId,
        messages: [
          {
            content: texto,
            message_type: "incoming"
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          api_access_token: process.env.CHATWOOT_API_TOKEN
        }
      }
    );

    console.log(`✅ Mensagem de ${numero} enviada para Chatwoot.`);
  } catch (err) {
    console.error("❌ Erro ao enviar para Chatwoot:", err.response?.data || err.message);
  }
}
