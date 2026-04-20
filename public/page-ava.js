const API_BASE = window.location.origin;
const mensagemDiv = document.getElementById('mensagem');
const form = document.getElementById('formAvaliacao');
const btn = document.getElementById('btnEnviar');

function mostrarMensagem(texto, tipo = "sucesso") {
  mensagemDiv.innerText = texto;
  mensagemDiv.className = "mensagem " + tipo;
}

function limparMensagem() {
  mensagemDiv.innerText = "";
  mensagemDiv.className = "mensagem";
}

function validarNota(valor) {
  return Number.isInteger(valor) && valor >= 1 && valor <= 5;
}

function sanitizarTexto(texto) {
  return texto.replace(/[<>]/g, "");
}

async function carregarLojas() {
  const select = document.getElementById('loja');
  select.innerHTML = '<option value="">Carregando...</option>';

  try {
    const res = await fetch(`${API_BASE}/lojas`);
    if (!res.ok) throw new Error();

    const lojas = await res.json();

    select.innerHTML = '<option value="">Selecione a Loja</option>';
    lojas.forEach(loja => {
      const option = document.createElement('option');
      option.value = loja.id;
      option.textContent = loja.nome;
      select.appendChild(option);
    });

  } catch {
    select.innerHTML = '<option value="">Erro ao carregar lojas</option>';
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  limparMensagem();

  const loja_id = parseInt(document.getElementById('loja').value);
  const nota_atendimento = parseInt(document.getElementById('atendimento').value);
  const nota_organizacao = parseInt(document.getElementById('organizacao').value);
  const nota_produtos = parseInt(document.getElementById('produtos').value);
  let comentario = document.getElementById('comentario').value.trim();

  if (!loja_id) {
    mostrarMensagem("Selecione uma loja.", "erro");
    return;
  }

  if (
    !validarNota(nota_atendimento) ||
    !validarNota(nota_organizacao) ||
    !validarNota(nota_produtos)
  ) {
    mostrarMensagem("Todas as notas devem ser entre 1 e 5.", "erro");
    return;
  }

  comentario = sanitizarTexto(comentario);

  btn.disabled = true;
  btn.textContent = "Enviando...";

  try {
    const res = await fetch(`${API_BASE}/avaliacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loja_id,
        nota_atendimento,
        nota_organizacao,
        nota_produtos,
        comentario
      })
    });

    if (!res.ok) {
      const erro = await res.json();
      throw new Error(erro.error || "Erro ao enviar");
    }

    mostrarMensagem("✅ Avaliação enviada com sucesso! Obrigado!", "sucesso");
    form.reset();

  } catch (err) {
    mostrarMensagem("❌ " + err.message, "erro");
  } finally {
    btn.disabled = false;
    btn.textContent = "Enviar Avaliação";
  }
});

carregarLojas();