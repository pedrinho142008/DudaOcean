(() => {
  function removerNewsletter() {
    const elementos = [...document.querySelectorAll('body *')];

    for (const el of elementos) {
      if (el.children.length > 4) continue;

      const texto = (el.innerText || '').trim().toLowerCase();
      if (!texto.includes('novidades com carinho')) continue;

      const area = el.closest(
        '.newsletter, .newsletter-section, .newsletter-area, #newsletter, section'
      );

      if (area && !area.matches('footer')) {
        area.remove();
      } else {
        const pai = el.parentElement;
        if (pai && !pai.matches('footer')) pai.remove();
      }
      break;
    }
  }

  function removerLupa() {
    document.querySelectorAll(
      '#searchSubmit, .search-btn, [data-search-button]'
    ).forEach(el => el.remove());

    document.querySelectorAll(
      '.topbar #searchPanel, .topbar #searchInput'
    ).forEach(el => el.remove());
  }

  function aumentarLogo() {
    const logo = document.querySelector(
      '.topbar .duda-logo-image, .topbar .brand img'
    );

    if (logo) {
      logo.style.setProperty('width', '112px', 'important');
      logo.style.setProperty('height', '112px', 'important');
      logo.style.setProperty('min-width', '112px', 'important');
      logo.style.setProperty('max-width', 'none', 'important');
      logo.style.setProperty('object-fit', 'contain', 'important');
    }

    const marca = document.querySelector('.topbar .brand');
    if (marca) {
      marca.style.setProperty('font-size', '0', 'important');
      marca.style.setProperty('gap', '0', 'important');
    }
  }

  function adicionarExemplosSeCatalogoVazio() {
    const grade = document.querySelector(
      '#productGrid, #productsGrid, #products, #produtos, ' +
      '.products-grid, .product-grid, .product-list, [data-products]'
    );

    if (!grade) return;

    const existentes = grade.querySelectorAll(
      '.product-card, .product-item, .product, [data-product-card]'
    );

    // Não substitui nem duplica produtos existentes.
    if (existentes.length > 0) return;

    const exemplos = [
      ['Colar delicado', 'Colares'],
      ['Brincos elegantes', 'Brincos'],
      ['Pulseira minimalista', 'Pulseiras'],
      ['Anel delicado', 'Anéis'],
      ['Conjunto de acessórios', 'Conjuntos'],
      ['Acessório para presentear', 'Acessórios']
    ];

    const fragmento = document.createDocumentFragment();

    exemplos.forEach(([nome, categoria]) => {
      const card = document.createElement('article');
      card.className = 'product-card demo-product';

      const imagem = document.createElement('div');
      imagem.className = 'demo-product-image';
      imagem.setAttribute('aria-label', 'Imagem demonstrativa');

      const selo = document.createElement('span');
      selo.className = 'demo-label';
      selo.textContent = 'EXEMPLO';

      const titulo = document.createElement('h3');
      titulo.textContent = nome;

      const tipo = document.createElement('p');
      tipo.className = 'demo-category';
      tipo.textContent = categoria;

      const aviso = document.createElement('p');
      aviso.className = 'demo-notice';
      aviso.textContent = 'Cadastre o produto real no painel';

      imagem.appendChild(selo);
      card.append(imagem, titulo, tipo, aviso);
      fragmento.appendChild(card);
    });

    grade.appendChild(fragmento);
    grade.classList.add('demo-products-grid');
  }

  function aplicar() {
    removerNewsletter();
    removerLupa();
    aumentarLogo();
    adicionarExemplosSeCatalogoVazio();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicar, { once: true });
  } else {
    aplicar();
  }
})();
