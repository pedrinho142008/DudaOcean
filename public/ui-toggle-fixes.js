(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function isVisible(el) {
    if (!el) return false;
    const style = getComputedStyle(el);
    return style.display !== "none" &&
      style.visibility !== "hidden" &&
      !el.hidden &&
      (el.classList.contains("open") ||
       el.classList.contains("active") ||
       el.classList.contains("show") ||
       el.classList.contains("is-open") ||
       el.getAttribute("aria-modal") === "true" ||
       el.getAttribute("aria-expanded") === "true" ||
       el.open === true);
  }

  function cartPanel() {
    return $("#cartDrawer") || $("#cartModal") || $("#cartPanel") ||
      $("#cartOverlay") || $(".cart-drawer") || $(".cart-modal") ||
      $(".cart-panel") || $(".cart-overlay");
  }

  function accountPanel() {
    return $("#accountModal") || $("#authModal") || $("#loginModal") ||
      $("#accountPanel") || $(".account-modal") || $(".auth-modal") ||
      $(".login-modal");
  }

  function closeElement(el) {
    if (!el) return;
    el.classList.remove("open", "active", "show", "is-open");
    el.setAttribute("aria-expanded", "false");
    el.setAttribute("aria-hidden", "true");
    if ("open" in el && el.tagName === "DIALOG" && el.open) {
      try { el.close(); } catch (_) {}
    }
  }

  function closeOtherPanels(except) {
    const candidates = $$(
      '[role="dialog"], [aria-modal="true"], .modal, .overlay, .drawer, ' +
      '.cart-drawer, .cart-modal, .cart-panel, .account-modal, .auth-modal, ' +
      '.login-modal, .search-panel, #searchPanel, #accountModal, #authModal, ' +
      '#loginModal, #accountPanel'
    );
    candidates.forEach(el => {
      if (el !== except && !el.contains(except)) closeElement(el);
    });
  }

  function toggleCart() {
    const panel = cartPanel();
    const wasOpen = isVisible(panel);
    if (wasOpen) {
      if (typeof window.closeCart === "function") window.closeCart();
      closeElement(panel);
    } else {
      closeOtherPanels(panel);
      if (typeof window.openCart === "function") window.openCart();
      else if (panel) {
        panel.classList.add("open");
        panel.removeAttribute("aria-hidden");
      }
    }
  }

  function toggleAccount() {
    const panel = accountPanel();
    const wasOpen = isVisible(panel);
    if (wasOpen) {
      closeElement(panel);
      const closeButton = $('[data-close], .modal-close, .close-modal, [aria-label*="Fechar"]', panel);
      if (closeButton) closeButton.click();
    } else {
      closeOtherPanels(panel);
      // Deixa o comportamento de login existente executar normalmente.
      const button = $("#accountBtn");
      if (button) {
        button.dataset.accountToggleAllow = "1";
        button.click();
        delete button.dataset.accountToggleAllow;
      }
    }
  }

  // Intercepta apenas os dois botões do cabeçalho.
  document.addEventListener("click", event => {
    const cart = event.target.closest("#cartOpen");
    const account = event.target.closest("#accountBtn");

    if (cart) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      toggleCart();
      return;
    }

    if (account && !account.dataset.accountToggleAllow) {
      const panel = accountPanel();
      if (panel && isVisible(panel)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        toggleAccount();
      }
    }
  }, true);

  // Escape fecha diálogos e painéis abertos.
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const panel = cartPanel();
    if (isVisible(panel)) {
      if (typeof window.closeCart === "function") window.closeCart();
      closeElement(panel);
    }
    $$('[role="dialog"], [aria-modal="true"], .modal.open, .overlay.open, ' +
       '.drawer.open, .search-panel.show, #searchPanel.show').forEach(closeElement);
  });

  // Fecha ao tocar no fundo externo do modal, sem fechar ao tocar no conteúdo.
  document.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const overlay = target.matches(
      '.modal, .overlay, .cart-overlay, [aria-modal="true"]'
    ) ? target : null;
    if (!overlay || target.querySelector("button, input, form, .modal-content, .drawer-content")) return;
    if (target.closest(".modal-content, .drawer-content, .cart-items, .cart-footer")) return;
    if (isVisible(overlay)) closeElement(overlay);
  });
})();
