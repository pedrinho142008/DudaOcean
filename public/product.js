(() => {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const slug = params.get("slug") || "";
  const demoProducts = Array.isArray(window.DEMO_PRODUCTS) ? window.DEMO_PRODUCTS : [];
  const money = value => Number(value || 0).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL"
  });
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[ch]);
  const makeSlug = value => String(value || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function findDemo() {
    return demoProducts.find(p =>
      String(p.slug || "") === slug ||
      makeSlug(p.name || p.title) === slug ||
      String(p.id || "") === slug
    );
  }

  async function getProduct() {
    try {
      const response = await fetch("/api/products/" + encodeURIComponent(slug));
      if (response.ok) {
        const result = await response.json();
        const product = result.product || result;
        if (product && (product.id || product.name || product.title)) return product;
      }
    } catch (_) {}
    return findDemo();
  }

  function showError() {
    const target = $("productDetail");
    if (target) target.innerHTML = `
      <div class="empty-state">
        <h2>Não encontramos essa peça</h2>
        <p>Ela pode ter sido removida ou ainda não estar cadastrada.</p>
        <a class="btn btn-dark" href="/">Voltar à loja</a>
      </div>`;
  }

  function renderProduct(p) {
    const target = $("productDetail");
    if (!target) return;

    const name = p.name || p.title || "Acessório";
    const category = p.category || "Acessórios";
    const images = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    if (!images.length && p.image) images.push(p.image);
    const image = images[0] || "";
    const price = Number(p.price || 0);
    const oldPrice = Number(p.compare_at_price || p.old_price || p.comparePrice || 0);
    const stock = Number(p.stock ?? 1);
    const isDemo = Boolean(p.demo);
    const description = p.description || "Um detalhe especial para complementar seu estilo.";
    document.title = name + " | Dudaocean";

    target.innerHTML = `
      <div class="detail-gallery">
        <div class="detail-main-image">
          ${image
            ? `<img id="mainPhoto" src="${esc(image)}" alt="${esc(name)}">`
            : `<div class="detail-no-image">Dudaocean</div>`}
          ${isDemo ? '<span class="demo-label">PRODUTO DE DEMONSTRAÇÃO</span>' : ""}
        </div>
        ${images.length > 1 ? `<div class="gallery-thumbs">${images.map((src, i) =>
          `<button type="button" class="gallery-thumb ${i === 0 ? "active" : ""}" data-image="${esc(src)}" aria-label="Ver imagem ${i + 1}">
            <img src="${esc(src)}" alt="">
          </button>`).join("")}</div>` : ""}
      </div>
      <div class="detail-info">
        <span class="eyebrow">${esc(category)}</span>
        <h1>${esc(name)}</h1>
        <div class="detail-prices">
          <strong>${money(price)}</strong>
          ${oldPrice > price ? `<del>${money(oldPrice)}</del>` : ""}
        </div>
        ${isDemo ? '<p class="demo-disclaimer">Preço e disponibilidade ilustrativos. Este é um exemplo visual, não uma oferta real.</p>' : ""}
        <p class="detail-description">${esc(description)}</p>
        ${!isDemo ? `<p class="detail-stock">${stock > 0 ? "Disponível" : "Produto esgotado"}</p>` : ""}
        <div class="detail-actions">
          <button class="btn btn-dark" id="detailAdd" type="button" ${stock <= 0 && !isDemo ? "disabled" : ""}>Adicionar à sacola</button>
          <button class="btn btn-outline" id="detailWhatsApp" type="button">Comprar pelo WhatsApp</button>
        </div>
        <p class="detail-note">Compra sujeita à confirmação de disponibilidade.</p>
      </div>`;

    const thumbs = target.querySelectorAll("[data-image]");
    thumbs.forEach(btn => btn.addEventListener("click", () => {
      const main = $("mainPhoto");
      if (main) main.src = btn.dataset.image;
      thumbs.forEach(item => item.classList.toggle("active", item === btn));
    }));

    $("detailAdd")?.addEventListener("click", () => {
      try {
        const key = "dudaocean_cart";
        const cart = JSON.parse(localStorage.getItem(key) || "[]");
        const id = String(p.id || p.slug || slug);
        const existing = cart.find(item => String(item.id) === id);
        if (existing) existing.quantity = Number(existing.quantity || existing.qty || 1) + 1;
        else cart.push({ id, quantity: 1, qty: 1, demo: isDemo, name, price, image });
        localStorage.setItem(key, JSON.stringify(cart));
        alert(isDemo
          ? "Exemplo adicionado à sacola. Este produto é apenas demonstrativo."
          : "Produto adicionado à sacola!");
      } catch (_) {
        alert("Não foi possível atualizar a sacola neste momento.");
      }
    });

    $("detailWhatsApp")?.addEventListener("click", () => {
      const number = String(window.WHATSAPP_NUMBER || "").replace(/\D/g, "");
      if (!number) {
        alert("Configure o número oficial do WhatsApp em public/app.js.");
        return;
      }
      const message = `Olá! Tenho interesse em ${name} (${money(price)}).`;
      location.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    });
  }

  (async () => {
    const target = $("productDetail");
    if (target) target.innerHTML = '<div class="detail-loading">Carregando produto…</div>';
    const product = await getProduct();
    if (product) renderProduct(product);
    else showError();
  })();
})();
