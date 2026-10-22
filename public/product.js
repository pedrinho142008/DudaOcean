(() => {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const slug = params.get("slug") || "";
  const money = value => Number(value || 0).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL"
  });
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[ch]);

  const formatDescription = value => {
    const lines = String(value || "").replace(/\r/g, "").split("\n");
    const blocks = [];
    let paragraph = [], bullets = [];

    const flushP = () => {
      if (paragraph.length) {
        blocks.push(`<p>${paragraph.map(esc).join(" ")}</p>`);
        paragraph = [];
      }
    };
    const flushL = () => {
      if (bullets.length) {
        blocks.push(`<ul>${bullets.map(x =>
          `<li>${esc(x.replace(/^(?:[-*•]|\d+[.)])\s*/, ""))}</li>`
        ).join("")}</ul>`);
        bullets = [];
      }
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { flushP(); flushL(); continue; }
      if (/^(?:[-*•]|\d+[.)])\s+/.test(line)) {
        flushP(); bullets.push(line); continue;
      }
      flushL();

      if (/^(detalhes|características|caracteristicas|especificações|especificacoes|como combinar|cuidados|composição|composicao|material|medidas|dimensões|dimensoes|informações de compra|informacoes de compra|descrição|descricao)\s*:?\s*$/i.test(line)) {
        flushP();
        blocks.push(`<h3>${esc(line.replace(/:$/, ""))}</h3>`);
        continue;
      }

      const pair = line.match(/^([^:]{2,35}):\s*(.+)$/);
      if (pair) {
        flushP();
        blocks.push(`<p class="description-detail"><strong>${esc(pair[1])}</strong><span>${esc(pair[2])}</span></p>`);
      } else {
        paragraph.push(line);
      }
    }

    flushP(); flushL();
    return blocks.join("") || `<p>${esc(value || "Um detalhe especial para complementar seu estilo.")}</p>`;
  };

  const makeSlug = value => String(value || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  async function getProduct() {
    try {
      const response = await fetch("/api/products/" + encodeURIComponent(slug));
      if (response.ok) {
        const result = await response.json();
        const product = result.product || result;
        if (product && (product.id || product.name || product.title)) return product;
      }
    } catch (_) {}
    return null;
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
        <section class="detail-description-card" aria-label="Descrição do produto">
          <div class="description-card-heading">
            <span>FEITO PARA VOCÊ</span>
            <h2>Sobre esta peça</h2>
          </div>
          <div class="detail-description">${formatDescription(description)}</div>
        </section>
        ${!isDemo ? `<p class="detail-stock">${stock > 0 ? `${stock} unidade(s) disponível(is)` : "Produto esgotado"}</p>` : ""}
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


    // Navegação por gesto horizontal na foto principal.
    const mainPhotoArea = target.querySelector(".detail-main-image");
    if (mainPhotoArea && images.length > 1) {
      let startX = 0, startY = 0, dragging = false;
      const mainPhoto = () => target.querySelector("#mainPhoto");
      const showImage = index => {
        const photo = mainPhoto();
        if (!photo) return;
        const next = (index + images.length) % images.length;
        photo.src = images[next];
        thumbs.forEach((item, i) => item.classList.toggle("active", i === next));
      };

      mainPhotoArea.addEventListener("touchstart", event => {
        const t = event.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        dragging = false;
      }, { passive: true });

      mainPhotoArea.addEventListener("touchmove", event => {
        const t = event.touches[0];
        if (Math.abs(t.clientX - startX) > 12 &&
            Math.abs(t.clientX - startX) > Math.abs(t.clientY - startY)) {
          dragging = true;
        }
      }, { passive: true });

      mainPhotoArea.addEventListener("touchend", event => {
        const t = event.changedTouches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
          const current = Math.max(0, images.indexOf(mainPhoto()?.getAttribute("src")));
          showImage(current + (dx < 0 ? 1 : -1));
          mainPhotoArea.dataset.swiped = "true";
          setTimeout(() => delete mainPhotoArea.dataset.swiped, 350);
        }
        dragging = false;
      }, { passive: true });

      mainPhotoArea.addEventListener("click", event => {
        if (mainPhotoArea.dataset.swiped === "true") {
          event.preventDefault();
          event.stopPropagation();
        }
      }, true);
    }

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
      const number = String(window.WHATSAPP_NUMBER || "558491810746").replace(/\D/g, "");
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
