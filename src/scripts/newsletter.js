// Aparece ao rolar: so quando o CSS ligou a classe "anim".
  (function () {
    const alvos = document.querySelectorAll("[data-rev]");
    if (!alvos.length) return;
    if (!document.documentElement.classList.contains("anim") || !("IntersectionObserver" in window)) {
      alvos.forEach(function (a) { a.classList.add("vis"); });
      return;
    }
    const obs = new IntersectionObserver(function (itens) {
      itens.forEach(function (it) {
        if (it.isIntersecting) { it.target.classList.add("vis"); obs.unobserve(it.target); }
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -6% 0px" });
    alvos.forEach(function (a) { obs.observe(a); });
    setTimeout(function () { alvos.forEach(function (a) { a.classList.add("vis"); }); }, 6000);
  })();


  // Endereço da função que fala com o Brevo.
  // Mesma origem do site: o arquivo functions/api/inscrever.js do repositório.
  const ENDERECO_INSCRICAO = "/api/inscrever";

  // UTM do anuncio: o Base.astro guarda no sessionStorage ao abrir qualquer pagina.
  // Aqui le de la (ou direto da URL, se o armazenamento estiver bloqueado).
  function lerUtm() {
    const chaves = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
    let salvo = {};
    try { salvo = JSON.parse(sessionStorage.getItem("cafuacu_utm") || "{}") || {}; } catch (e) { salvo = {}; }
    const q = new URLSearchParams(location.search);
    const utm = {};
    chaves.forEach(function (k) {
      const v = String(q.get(k) || salvo[k] || "").trim().toLowerCase();
      if (/^[a-z0-9_-]{1,60}$/.test(v)) utm[k] = v;
    });
    return utm;
  }

  (function () {
    const form = document.getElementById("assinar");
    const campo = document.getElementById("email");
    const botao = document.getElementById("enviar");
    const trilho = document.getElementById("trilho");
    const recado = document.getElementById("recado");
    const pronto = document.getElementById("pronto");
    if (!form) return;

    const PADRAO = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
    const TEXTO_BOTAO = "quero receber";

    function avisar(texto, tipo) {
      recado.textContent = texto || "";
      recado.className = tipo || "";
    }

    // Enquanto ela digita: a borda fica verde quando o e-mail já está de pé,
    // e o recado de erro some sozinho. Nada de gritar antes da hora.
    campo.addEventListener("input", function () {
      trilho.classList.toggle("valido", PADRAO.test(campo.value.trim()));
      if (recado.classList.contains("erro")) avisar("");
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = campo.value.trim();

      if (!PADRAO.test(email)) {
        avisar("Esse e-mail parece incompleto, confere pra mim?", "erro");
        campo.focus();
        return;
      }

      botao.disabled = true;
      botao.textContent = "passando o caf\u00e9\u2026";
      avisar("");

      try {
        const r = await fetch(ENDERECO_INSCRICAO, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.assign({ email: email }, lerUtm())),
        });

        if (!r.ok) throw new Error("resposta " + r.status);

        const dados = await r.json().catch(() => ({}));
        mostrarSucesso(email, dados.status);
      } catch (err) {
        botao.disabled = false;
        botao.textContent = TEXTO_BOTAO;
        avisar("Deu ruim aqui do nosso lado. Tenta de novo em instantes, ou escreve pra contato@cafuacu.com.br", "erro");
      }
    });

    // ---- a comemoracao ----
    const eco = document.getElementById("eco");
    const chuva = document.getElementById("chuva");
    const voltar = document.getElementById("voltar");
    const proTitulo = document.getElementById("proTitulo");
    const proFrase = document.getElementById("proFrase");

    // "active" é gente que já estava confirmada (reinscrição de quem já
    // assina). Não chega e-mail novo nenhum nesse caso, então o aviso não
    // pode dizer "abre e confirma" — quem já assina ficaria esperando à toa.
    function mostrarSucesso(email, status) {
      eco.textContent = email;
      if (status === "active") {
        proTitulo.textContent = "Você já é assinante";
        proFrase.innerHTML = 'Esse e-mail já está confirmado na lista. Não precisa fazer nada, é só esperar a próxima edição.';
      } else {
        proTitulo.textContent = "Falta um clique";
        proFrase.innerHTML = 'Acabou de sair um e-mail de <b>Cafuaçu</b> pra aí. Abre, confirma, e você entra na lista.';
      }
      form.hidden = true;
      pronto.hidden = false;
      pronto.focus();
      soltarGraos();
    }

    // Doze graozinhos caindo, posicao e tempo sorteados, uma vez so.
    function soltarGraos() {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      chuva.innerHTML = "";
      for (let i = 0; i < 12; i++) {
        const g = document.createElement("i");
        g.style.left = (4 + Math.random() * 92) + "%";
        g.style.animationDelay = (Math.random() * 0.45).toFixed(2) + "s";
        g.style.animationDuration = (1.2 + Math.random() * 0.8).toFixed(2) + "s";
        chuva.appendChild(g);
      }
      setTimeout(function () { chuva.innerHTML = ""; }, 2600);
    }

    // Errou o e-mail? O formulario volta com o que ela digitou, pronto pra corrigir.
    voltar.addEventListener("click", function () {
      pronto.hidden = true;
      form.hidden = false;
      botao.disabled = false;
      botao.textContent = TEXTO_BOTAO;
      avisar("");
      campo.focus();
      campo.setSelectionRange(campo.value.length, campo.value.length);
    });
  })();
