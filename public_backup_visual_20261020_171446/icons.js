(() => {
  const icons = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6"/>',
    bag: '<path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',
    heart: '<path d="M20.8 8.8c0 4.2-8.8 10-8.8 10s-8.8-5.8-8.8-10A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.6Z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 5l7 7-7 7"/>'
  };

  function svg(name) {
    return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.arrow}</svg>`;
  }

  const style = document.createElement('style');
  style.textContent = `
    .ui-icon {
      width: 21px;
      height: 21px;
      display: inline-block;
      flex: 0 0 auto;
      vertical-align: middle;
    }
    .icon-btn .ui-icon { width: 21px; height: 21px; }
    .favorite .ui-icon { width: 19px; height: 19px; }
    .quick-add .ui-icon { width: 15px; height: 15px; }
    .btn .ui-icon { width: 16px; height: 16px; }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; }
    .favorite { display: grid; place-items: center; }
    .ui-icon-fill { fill: currentColor; }
  `;
  document.head.appendChild(style);

  function replaceButton(id, name) {
    const el = document.getElementById(id);
    if (!el || el.querySelector('.ui-icon')) return;
    el.innerHTML = svg(name);
  }

  function decorate() {
    replaceButton('searchToggle', 'search');
    replaceButton('accountBtn', 'user');
    replaceButton('cartOpen', 'bag');

    const cart = document.getElementById('cartOpen');
    if (cart && !cart.querySelector('#cartCount')) {
      const count = document.createElement('span');
      count.id = 'cartCount';
      count.textContent = '0';
      cart.appendChild(count);
    }

    document.querySelectorAll('[data-favorite]').forEach(button => {
      const active = button.textContent.trim() === '♥';
      if (button.querySelector('.ui-icon')) return;
      button.innerHTML = svg('heart');
      button.style.color = active ? '#9a594f' : '#795b49';
      const path = button.querySelector('path');
      if (path && active) path.setAttribute('fill', 'currentColor');
    });

    document.querySelectorAll('[data-add]').forEach(button => {
      if (button.disabled || button.textContent.trim() === 'Adicionar à sacola') return;
      button.textContent = 'Adicionar à sacola';
    });

    document.querySelectorAll('.close-btn').forEach(button => {
      if (button.textContent.trim() === '×' && !button.querySelector('.ui-icon')) {
        button.innerHTML = svg('close');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', decorate);
  } else {
    decorate();
  }

  const observer = new MutationObserver(() => decorate());
  observer.observe(document.body, { childList: true, subtree: true });
})();
