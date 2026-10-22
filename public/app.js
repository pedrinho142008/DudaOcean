/*
 * Para ativar Supabase, configure as constantes abaixo com URL e chave ANON do projeto.
 * A chave anon pode estar no navegador se o banco tiver políticas RLS corretas.
 * NUNCA coloque service_role ou token Mercado Pago neste arquivo.
 */
const SUPABASE_URL = "https://mwfpezbntlyjnmficqsp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13ZnBlemJudGx5am5tZmljcXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjM3NjYsImV4cCI6MjEwODE5OTc2Nn0.LlouHqn9zKYBKU6uvvZFGt7teuy0Vayrnug11m9y63I";
const WHATSAPP_NUMBER = "558491810746"; // WhatsApp oficial
const supabaseClient = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
window.dudaoceanSupabase = supabaseClient;

const money = n => Number(n || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const $ = id => document.getElementById(id);
let products = [], selectedCategory = "Todos", searchTerm = "";
let cart = JSON.parse(localStorage.getItem("dudaocean_cart") || "[]");
let favorites = new Set(JSON.parse(localStorage.getItem("dudaocean_favorites") || "[]"));
let toastTimer;

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
function safeImage(product) {
  if (product.video_url) return product.video_url;
  const imgs = Array.isArray(product.images) ? product.images : [];
  return imgs[0] || "";
}
function persistCart() {
  localStorage.setItem("dudaocean_cart", JSON.stringify(cart));
  renderCart(); updateCartCount();
}
function updateCartCount() {
  const count = cart.reduce((n,item)=>n+item.quantity,0);
  $("cartCount").textContent = count; $("drawerCount").textContent = `(${count})`;
}

function productCard(p) {
  const image = safeImage(p);
  const photo = p.video_url
    ? `<video class="product-cover-video" src="${escapeHtml(p.video_url)}" autoplay muted loop playsinline preload="metadata"></video>`
    : image
      ? `<img loading="lazy" src="${escapeHtml(image)}" alt="${escapeHtml(p.title)}" onerror="this.style.display='none';this.parentElement.classList.add('no-photo')">`
      : `<div class="photo-placeholder">Foto em breve</div>`;
  const stock = Math.max(0, Number(p.stock) || 0);
  const discount = p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
    ? Math.round((1 - Number(p.price) / Number(p.compare_at_price)) * 100) : 0;

  return `<article class="product-card ${p.demo ? "demo-product" : ""}">
    <div class="product-photo-wrap">
      <a class="product-photo" href="/produto.html?slug=${encodeURIComponent(p.slug)}">${photo}</a>
      ${p.demo ? '<span class="demo-label">DEMONSTRAÇÃO</span>' : ''}
      ${discount ? `<span class="discount-label">-${discount}%</span>` : ''}
      <button class="favorite" type="button" data-favorite="${escapeHtml(p.id)}" aria-label="Favoritar">${favorites.has(String(p.id)) ? "♥" : "♡"}</button>
    </div>
    <div class="product-meta">
      <span class="product-category">${escapeHtml(p.category || "Acessórios")}</span>
      <a class="product-title" href="/produto.html?slug=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a>
      <div class="price">${money(p.price)} ${p.compare_at_price && Number(p.compare_at_price) > Number(p.price) ? `<span class="old-price">${money(p.compare_at_price)}</span>` : ""}</div>
      ${p.demo ? '<span class="demo-price-note">Preço ilustrativo — não é oferta real</span>' : ''}
      <span class="catalog-stock">${stock > 0 ? (stock === 1 ? "Última unidade disponível" : `${stock} unidades disponíveis`) : "Sem estoque"}</span>
    </div>
    <button class="quick-add" type="button" data-add="${escapeHtml(p.id)}" ${stock <= 0 ? "disabled" : ""}>${stock <= 0 ? "Sem estoque" : "Adicionar à sacola"}</button>
  </article>`;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

async function loadProducts() {
  const grid = $("productGrid");
  const summary = $("productSummary");

  try {
    // Buscar o catálogo completo para não apagar itens ao mudar de categoria.
    const response = await fetch("/api/products");
    if (!response.ok) throw new Error("Catálogo indisponível");
    const result = await response.json();
    const catalog = Array.isArray(result.products) ? result.products : [];
    const activeIds = new Set(catalog.map(p => String(p.id)));

    cart = cart.filter(item => activeIds.has(String(item.id)));
    cart = cart.map(item => {
      const p = catalog.find(x => String(x.id) === String(item.id));
      return {
        ...item, id: p.id, title: p.title, name: p.title, slug: p.slug,
        price: Number(p.price || 0), image: safeImage(p),
        video: Boolean(p.video_url), stock: Math.max(0, Number(p.stock) || 0),
        quantity: Math.max(1, Number(item.quantity || item.qty || 1))
      };
    });

    favorites = new Set([...favorites].filter(id => activeIds.has(String(id))));
    localStorage.setItem("dudaocean_cart", JSON.stringify(cart));
    localStorage.setItem("dudaocean_favorites", JSON.stringify([...favorites]));
    renderCart();
    updateCartCount();

    const term = searchTerm.toLocaleLowerCase("pt-BR");
    products = catalog.filter(p => {
      const categoryMatch = selectedCategory === "Todos" || p.category === selectedCategory;
      const content = `${p.title || ""} ${p.description || ""} ${p.category || ""}`.toLocaleLowerCase("pt-BR");
      return categoryMatch && (!term || content.includes(term));
    });
  } catch (err) {
    console.error("Falha ao atualizar catálogo:", err);
    // Não apagar os dados locais quando a rede falhar.
    products = [];
  }

  grid.innerHTML = products.length
    ? products.map(productCard).join("")
    : `<div class="empty-state"><h3>Nenhuma peça encontrada</h3><p>Experimente outra categoria ou busca.</p></div>`;
  summary.textContent = products.length
    ? `${products.length} ${products.length === 1 ? "peça" : "peças"}`
    : "Nenhum produto";
}


function addToCart(id) {
  const p = products.find(x => String(x.id) === String(id));
  if (!p) return toast("Produto não encontrado. Atualize a página.");
  const stock = Math.max(0, Number(p.stock) || 0);
  if (stock <= 0) return toast("Este produto está sem estoque.");

  const item = cart.find(x => String(x.id) === String(id));
  if (item) {
    if (Number(item.quantity || 1) >= stock) return toast(`Estoque disponível: ${stock} unidade(s).`);
    item.quantity = Number(item.quantity || 1) + 1;
    item.stock = stock;
  } else {
    cart.push({
      id: p.id, slug: p.slug, title: p.title, name: p.title,
      price: Number(p.price), image: safeImage(p),
      video: Boolean(p.video_url), stock, quantity: 1
    });
  }
  persistCart();
  toast("Adicionado à sua sacola ✧");
}


function renderCart() {
  const box = $("cartItems");
  if (!cart.length) {
    box.innerHTML = '<p class="muted">Sua sacola está vazia. Encontre uma peça para começar.</p>';
  } else {
    box.innerHTML = cart.map(item => {
      const stock = Math.max(0, Number(item.stock) || 0);
      const out = stock <= 0;
      const tooMany = !out && Number(item.quantity) > stock;
      const image = item.image
        ? (item.video
          ? `<video class="cart-thumb" src="${escapeHtml(item.image)}" muted autoplay loop playsinline></video>`
          : `<img class="cart-thumb" src="${escapeHtml(item.image)}" alt="">`)
        : '<div class="cart-thumb"></div>';
      return `<div class="cart-row ${out ? "cart-row-out" : ""}">
        ${image}
        <div class="cart-row-info">
          <a href="/produto.html?slug=${encodeURIComponent(item.slug || "")}" class="product-title">${escapeHtml(item.title || item.name || "Produto")}</a>
          <small>${money(item.price)}</small>
          ${out ? '<span class="cart-stock-warning">Sem estoque</span>' : tooMany ? `<span class="cart-stock-warning">Disponível: ${stock} unidade(s)</span>` : `<span class="cart-stock-ok">${stock} em estoque</span>`}
          <div class="qty-controls">
            <button data-qty="${escapeHtml(item.id)}" data-delta="-1">−</button>
            <span>${item.quantity}</span>
            <button data-qty="${escapeHtml(item.id)}" data-delta="1" ${out || Number(item.quantity) >= stock ? "disabled" : ""}>+</button>
          </div>
        </div>
        <button class="close-btn" data-remove="${escapeHtml(item.id)}" aria-label="Remover">×</button>
      </div>`;
    }).join("");
  }
  $("cartTotal").textContent = money(cart.reduce((n, i) =>
    n + (Number(i.stock) > 0 ? Number(i.price || 0) * Number(i.quantity || 1) : 0), 0));
}


function openCart(){ $("cartOverlay").classList.add("open"); $("cartDrawer").classList.add("open"); }
function closeCart(){ $("cartOverlay").classList.remove("open"); $("cartDrawer").classList.remove("open"); }
function hasUnavailableCartItems() {
  return cart.some(item =>
    Number(item.stock) <= 0 ||
    Number(item.quantity || 1) > Number(item.stock)
  );
}
function orderMessage() {
  const total = cart.reduce((s, i) =>
    s + Number(i.price || 0) * Number(i.quantity || i.qty || 1), 0);

  const lines = cart.map(i => {
    const q = Number(i.quantity || i.qty || 1);
    const price = Number(i.price || 0);
    return `• ${i.title || i.name || "Produto"}
  Quantidade: ${q}
  Valor unitário: ${money(price)}
  Subtotal: ${money(price * q)}`;
  });

  return `Olá! 💕 Gostaria de fazer um pedido na DudaOcean.

MEU PEDIDO

${lines.join("\n\n")}

TOTAL DOS PRODUTOS: ${money(total)}

Poderia confirmar a disponibilidade, o frete e as formas de pagamento, por favor?`;
}
function whatsappOrder() {
  if (!cart.length) return toast("Sua sacola está vazia.");
  if (hasUnavailableCartItems()) return toast("Remova itens sem estoque ou ajuste as quantidades.");
  if (!WHATSAPP_NUMBER) return toast("Configure o número oficial do WhatsApp em public/app.js.");
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage())}`,"_blank","noopener");
}
function checkout() {
  if (!cart.length) return toast("Sua sacola está vazia.");
  if (hasUnavailableCartItems()) return toast("Remova itens sem estoque ou ajuste as quantidades.");
  if (!WHATSAPP_NUMBER) return toast("WhatsApp não configurado.");
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage())}`;
  window.location.href = url;
}
$("productGrid").addEventListener("click", e=>{
  const add=e.target.closest("[data-add]"); if(add) addToCart(add.dataset.add);
  const fav=e.target.closest("[data-favorite]"); if(fav) {
    const id=fav.dataset.favorite;
    if(favorites.has(String(id))) favorites.delete(String(id)); else favorites.add(String(id));
    localStorage.setItem("dudaocean_favorites",JSON.stringify([...favorites])); fav.textContent=favorites.has(String(id))?"♥":"♡";
  }
});
$("cartItems").addEventListener("click", e => {
  const remove = e.target.closest("[data-remove]");
  if (remove) {
    cart = cart.filter(i => String(i.id) !== remove.dataset.remove);
    persistCart();
    return;
  }

  const qty = e.target.closest("[data-qty]");
  if (!qty) return;

  const item = cart.find(i => String(i.id) === qty.dataset.qty);
  if (!item) return;

  const delta = Number(qty.dataset.delta);
  const next = Number(item.quantity || 1) + delta;
  const stock = Math.max(0, Number(item.stock) || 0);

  if (delta > 0 && (stock <= 0 || next > stock)) {
    toast(stock <= 0 ? "Produto sem estoque." : `Só há ${stock} unidade(s) disponíveis.`);
    return;
  }

  if (next <= 0) cart = cart.filter(i => i !== item);
  else item.quantity = next;

  persistCart();
});
$("categoryPills").addEventListener("click",e=>{
  const b=e.target.closest("[data-category]");if(!b)return;
  selectedCategory=b.dataset.category;
  document.querySelectorAll(".pill").forEach(p=>p.classList.toggle("active",p===b));loadProducts();
});
if ($("searchToggle")) $("searchToggle").addEventListener("click",()=>{$("searchPanel").classList.toggle("show");if($("searchPanel").classList.contains("show"))$("searchInput").focus();});
if ($("searchSubmit")) $("searchSubmit").addEventListener("click",()=>{searchTerm=$("searchInput").value.trim();loadProducts();});
$("searchInput").addEventListener("keydown",e=>{if(e.key==="Enter"){searchTerm=e.target.value.trim();loadProducts();}});
$("cartOpen").addEventListener("click",openCart);$("cartClose").addEventListener("click",closeCart);$("cartOverlay").addEventListener("click",closeCart);
$("checkoutBtn").addEventListener("click",checkout);$("whatsOrderBtn").addEventListener("click",whatsappOrder);
$("whatsFooter").addEventListener("click",e=>{e.preventDefault();if(!WHATSAPP_NUMBER)return toast("Configure o número oficial do WhatsApp em public/app.js.");window.open(`https://wa.me/${WHATSAPP_NUMBER}`,"_blank","noopener");});
$("accountBtn").addEventListener("click",()=>{window.location.href="/conta.html";});
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close).classList.remove("open")));
$("accountModal").addEventListener("click",e=>{if(e.target===$("accountModal"))$("accountModal").classList.remove("open");});
let authMode = "login";

$("signupBtn").addEventListener("click",()=>{
  authMode = authMode === "login" ? "signup" : "login";
  const signupMode = authMode === "signup";

  document.querySelectorAll(".signup-only").forEach(el => {
    el.classList.toggle("hidden", !signupMode);
  });

  $("authName").required = signupMode;
  $("authPhone").required = signupMode;
  $("loginBtn").classList.toggle("hidden", signupMode);
  $("createAccountBtn").classList.toggle("hidden", !signupMode);
  $("signupBtn").textContent = signupMode ? "Voltar para entrar" : "Criar conta";
  $("authPassword").autocomplete = signupMode ? "new-password" : "current-password";
  $("authMessage").textContent = "";
});
$("authForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const msg=$("authMessage");
  if(!supabaseClient){
    msg.textContent="A conexão com o Supabase não está configurada.";
    return;
  }

  const email=$("authEmail").value.trim();
  const password=$("authPassword").value;
  const signupMode = authMode === "signup";
  const fullName=$("authName").value.trim();
  const phone=$("authPhone").value.trim();

  if(signupMode && !phone){
    msg.textContent="Informe seu telefone com DDD.";
    $("authPhone").focus();
    return;
  }

  try{
    let result;
    if(signupMode){
      result=await supabaseClient.auth.signUp({
        email,
        password,
        options:{
          data:{
            full_name:fullName,
            phone:phone
          }
        }
      });
    }else{
      result=await supabaseClient.auth.signInWithPassword({email,password});
    }

    if(result.error) throw result.error;

    if(signupMode && result.data.session){
      msg.textContent="Cadastro realizado com sucesso! Bem-vinda à DudaOcean.";
      toast("Seja muito bem-vinda à DudaOcean! ✧ Que bom ter você aqui.");
    }else if(signupMode){
      msg.textContent="Cadastro criado, mas ainda não há sessão ativa. Confira a configuração de confirmação de e-mail no Supabase.";
    }else{
      msg.textContent="Login realizado com sucesso.";
    }
  }catch(err){
    msg.textContent=err.message||"Não foi possível autenticar.";
  }
});
if ($("newsletterForm")) $("newsletterForm").addEventListener("submit",async e=>{
  e.preventDefault();const email=$("newsletterEmail").value.trim();
  if(!supabaseClient){$("newsletterMessage").textContent="Cadastro de novidades precisa ser ativado no Supabase.";return;}
  const {error}=await supabaseClient.from("newsletter_subscribers").insert({email});
  $("newsletterMessage").textContent=error?"Não foi possível cadastrar agora.":"Pronto! Seu e-mail foi cadastrado.";
  if(!error)e.target.reset();
});
$("year").textContent=new Date().getFullYear();
renderCart();updateCartCount();loadProducts();
