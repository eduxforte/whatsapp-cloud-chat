<script>
  let mensagensGlobais = {};
  let numeroAtual = null;

  async function carregarMensagens() {
    try {
      const res = await fetch('/messages');
      mensagensGlobais = await res.json();

      const contatosDiv = document.getElementById('contatos');
      contatosDiv.innerHTML = '';

      const numeros = Object.keys(mensagensGlobais);
      if (numeros.length === 0) {
        contatosDiv.innerText = 'Nenhum contato com mensagens.';
        return;
      }

      numeros.forEach(numero => {
        const btn = document.createElement('button');
        btn.innerText = numero;
        btn.onclick = () => {
          numeroAtual = numero;
          exibirConversa(numero);
        };
        contatosDiv.appendChild(btn);
      });
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      document.getElementById('contatos').innerText = 'Erro ao carregar contatos.';
    }
  }

  function exibirConversa(numero) {
    numeroAtual = numero;
    const div = document.getElementById('conversa');
    div.innerHTML = `<h3>Conversa com ${numero}</h3>`;

    const mensagens = mensagensGlobais[numero] || [];
    if (mensagens.length === 0) {
      div.innerHTML += '<p><i>Sem mensagens.</i></p>';
    } else {
      mensagens.forEach(m => {
        const hora = new Date(m.timestamp).toLocaleString();
        div.innerHTML += `<p><b>${m.from}:</b> ${m.msg} <small style="color:#666">(${hora})</small></p>`;
      });
    }

    document.getElementById('destinatario').value = numero;
    document.getElementById('destinatario').disabled = false;
  }

  async function enviarMensagem() {
    const to = document.getElementById('destinatario').value.trim();
    const text = document.getElementById('mensagem').value.trim();

    if (!to) {
      alert('Digite o número do cliente.');
      return;
    }
    if (!text) {
      alert('Digite a mensagem.');
      return;
    }

    try {
      const res = await fetch('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, text })
      });

      if (!res.ok) {
        const error = await res.json();
        alert('Erro ao enviar mensagem: ' + (error.error?.message || JSON.stringify(error)));
        return;
      }

      document.getElementById('mensagem').value = '';
      await carregarMensagens();
      exibirConversa(to); // Atualiza a conversa imediatamente após o envio
    } catch (err) {
      alert('Erro inesperado ao enviar mensagem.');
      console.error(err);
    }
  }

  window.onload = () => {
    carregarMensagens();
    setInterval(async () => {
      await carregarMensagens();
      if (numeroAtual) {
        exibirConversa(numeroAtual);
      }
    }, 5000); // Atualiza a cada 5 segundos
  };
</script>
