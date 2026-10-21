(() => {
  const A = '/assets/';

  function replaceIcon(button, file, alt) {
    if (!button) return;

    let img = button.querySelector('img.duda-ui-icon');

    if (!img) {
      img = document.createElement('img');
      img.className = 'duda-ui-icon';
      button.prepend(img);
    }

    img.src = A + file;
    img.alt = alt;
    img.draggable = false;

    // Remove ícones antigos, preservando outros elementos funcionais.
    button.querySelectorAll(
      'svg, i, .icon, .material-icons, [data-lucide], [class*="icon-"]'
    ).forEach(old => old.remove());

    // Remove emojis e textos visuais antigos sem remover outros elementos.
    Array.from(button.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        node.textContent = '';
      }
    });

    button.classList.add('duda-icon-button');
  }

  function run() {
    // Logo: somente a imagem, sem nome da marca.
    const brand = document.querySelector(
      '[data-logo], #logo, .site-logo, .brand, a.logo, .navbar-brand'
    );

    if (brand) {
      brand.querySelectorAll('img').forEach(img => img.remove());
      brand.querySelectorAll(
        'svg, i, .icon, .material-icons, [data-lucide], [class*="icon-"]'
      ).forEach(old => old.remove());

      brand.querySelectorAll(
        '.brand-name, .site-name, .logo-text, [data-brand-name]'
      ).forEach(el => el.remove());

      const logo = document.createElement('img');
      logo.src = A + 'duda.png';
      logo.alt = 'Dudaocean';
      logo.className = 'duda-logo-image';
      logo.draggable = false;
      brand.prepend(logo);
      brand.classList.add('duda-brand-fixed');
    }

    // Conta e sacola: troca os ícones nos botões encontrados.
    document.querySelectorAll(
      '#accountBtn, [data-account], .account-btn, a[href*="conta"], a[href*="login"]'
    ).forEach(el => replaceIcon(el, 'conta.png', 'Conta'));

    document.querySelectorAll(
      '#cartOpen, [data-cart], .cart-btn, a[href*="carrinho"], a[href*="sacola"]'
    ).forEach(el => replaceIcon(el, 'sacola.png', 'Sacola'));

    // Busca: procura somente na área de produtos.
    const products = document.querySelector(
      '#produtos, #products, .products-section, [data-products-section]'
    );

    if (products) {
      products.querySelectorAll(
        '[data-search-button], .search-btn, #searchBtn, button[aria-label*="buscar" i], button[aria-label*="pesquisar" i]'
      ).forEach(el => replaceIcon(el, 'lupa.png', 'Buscar'));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
