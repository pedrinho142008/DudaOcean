(() => {
  const KEY = "dudaocean_favorites";

  function readFavorites() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "[]");
      return new Set(value.map(String));
    } catch (_) {
      return new Set();
    }
  }

  function saveFavorites(set) {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  }

  function notify(message) {
    let box = document.getElementById("dudaStoreToast");
    if (!box) {
      box = document.createElement("div");
      box.id = "dudaStoreToast";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.classList.add("visible");
    clearTimeout(window.__dudaToastTimer);
    window.__dudaToastTimer = setTimeout(() => box.classList.remove("visible"), 2600);
  }

  function syncFavoriteButtons() {
    const favorites = readFavorites();
    document.querySelectorAll("[data-favorite]").forEach(button => {
      const active = favorites.has(String(button.dataset.favorite));
      button.classList.toggle("is-favorite", active);
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", active ? "Remover dos favoritos" : "Adicionar aos favoritos");
      button.textContent = active ? "♥" : "♡";
    });
  }

  // Intercepta o clique antes do manipulador antigo para evitar duplicidade.
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-favorite]");
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const id = String(button.dataset.favorite || "");
    if (!id) return;

    const favorites = readFavorites();
    if (favorites.has(id)) {
      favorites.delete(id);
      saveFavorites(favorites);
      notify("♡ Removido dos seus favoritos.");
    } else {
      favorites.add(id);
      saveFavorites(favorites);
      notify("♥ Adicionado aos seus favoritos!");
    }
    syncFavoriteButtons();
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncFavoriteButtons, { once: true });
  } else {
    syncFavoriteButtons();
  }
})();
