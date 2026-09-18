// Aparece ao rolar: só age quando o <head> ligou a classe "anim" (ou seja, sem "reduzir movimento").
(function () {
  const raiz = document.documentElement;
  if (!raiz.classList.contains("anim")) return;
  const alvos = document.querySelectorAll(".cab, .linha, .passo, .destaque, .salvar, .tile, .prosa > *, .fecho-in > *");
  if (!alvos.length) return;
  if (!("IntersectionObserver" in window)) {
    alvos.forEach((a) => a.classList.add("vis"));
    return;
  }
  const contagem = new Map();
  alvos.forEach((a) => {
    const i = contagem.get(a.parentElement) || 0;
    a.style.setProperty("--i", Math.min(i, 6));
    contagem.set(a.parentElement, i + 1);
  });
  const obs = new IntersectionObserver(
    (itens) => {
      itens.forEach((it) => {
        if (it.isIntersecting) {
          it.target.classList.add("vis");
          obs.unobserve(it.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -5% 0px" }
  );
  alvos.forEach((a) => obs.observe(a));
  setTimeout(() => alvos.forEach((a) => a.classList.add("vis")), 6000);
})();
