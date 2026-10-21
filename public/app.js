/*
 * Para ativar Supabase, configure as constantes abaixo com URL e chave ANON do projeto.
 * A chave anon pode estar no navegador se o banco tiver políticas RLS corretas.
 * NUNCA coloque service_role ou token Mercado Pago neste arquivo.
 */
const SUPABASE_URL = "https://mwfpezbntlyjnmficqsp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13ZnBlemJudGx5am5tZmljcXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjM3NjYsImV4cCI6MjEwODE5OTc2Nn0.LlouHqn9zKYBKU6uvvZFGt7teuy0Vayrnug11m9y63I";
const WHATSAPP_NUMBER = ""; // Ex.: 5584999999999 (DDI+DDD+número, sem + ou espaços)
const supabaseClient = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

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
  const photo = image
    ? `<img loading="lazy" src="${escapeHtml(image)}" alt="${escapeHtml(p.title)}" onerror="this.style.display='none';this.parentElement.classList.add('no-photo')">`
    : `<div class="photo-placeholder">Foto em breve</div>`;
  const discount = p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
    ? Math.round((1 - Number(p.price) / Number(p.compare_at_price)) * 100)
    : 0;

  return `<article class="product-card ${p.demo ? "demo-product" : ""}">
    <div class="product-photo-wrap">
      <a class="product-photo" href="/produto.html?slug=${encodeURIComponent(p.slug)}">${photo}</a>
      ${p.demo ? '<span class="demo-label">DEMONSTRAÇÃO</span>' : ''}
      ${discount ? `<span class="discount-label">-${discount}%</span>` : ''}
      <button class="favorite" type="button" data-favorite="${escapeHtml(p.id)}" aria-label="Favoritar ${escapeHtml(p.title)}">${favorites.has(String(p.id))?"♥":"♡"}</button>
    </div>
    <div class="product-meta">
      <span class="product-category">${escapeHtml(p.category || "Acessórios")}</span>
      <a class="product-title" href="/produto.html?slug=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a>
      <div class="price">${money(p.price)} ${p.compare_at_price && Number(p.compare_at_price)>Number(p.price) ? `<span class="old-price">${money(p.compare_at_price)}</span>` : ""}</div>
      ${p.demo ? '<span class="demo-price-note">Preço ilustrativo — não é oferta real</span>' : ''}
    </div>
    <button class="quick-add" type="button" data-add="${escapeHtml(p.id)}" ${Number(p.stock)<=0?"disabled":""}>${Number(p.stock)<=0?"Esgotado":"Adicionar à sacola"}</button>
  </article>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

async function loadProducts() {
  const grid = $("productGrid");
  const summary = $("productSummary");

  function demoList() {
    let list = Array.isArray(window.DEMO_PRODUCTS) ? [...window.DEMO_PRODUCTS] : [];
    if (selectedCategory !== "Todos")
      list = list.filter(p => p.category === selectedCategory);
    if (searchTerm)
      list = list.filter(p => (p.title + " " + p.category).toLowerCase().includes(searchTerm.toLowerCase()));
    return list;
  }

  try {
    const url = new URL("/api/products", location.origin);
    if (selectedCategory !== "Todos") url.searchParams.set("category", selectedCategory);
    if (searchTerm) url.searchParams.set("q", searchTerm);

    const response = await fetch(url);
    if (!response.ok) throw new Error("API indisponível");
    const result = await response.json();
    products = result.products || [];

    // Os exemplos só aparecem quando a API não tem produtos reais.
    if (!products.length) products = demoList();
  } catch (err) {
    products = demoList();
  }

  grid.innerHTML = products.length
    ? products.map(productCard).join("")
    : `<div class="empty-state"><h3>Nenhuma peça encontrada</h3><p>Experimente outra categoria ou busca.</p></div>`;

  summary.textContent = products.length
    ? `${products.length} ${products.length === 1 ? "peça" : "peças"}`
    : "Nenhum produto";
}

function addToCart(id) {
  const p = products.find(x=>String(x.id)===String(id));
  if (!p) return toast("Produto não encontrado. Atualize a página.");
  if (Number(p.stock) <= 0) return toast("Este produto está esgotado.");
  const item = cart.find(x=>String(x.id)===String(id));
  if (item) {
    if (item.quantity >= Number(p.stock)) return toast("Você já adicionou todo o estoque disponível.");
    item.quantity++;
  } else cart.push({id:p.id,slug:p.slug,title:p.title,price:Number(p.price),image:safeImage(p),quantity:1});
  persistCart(); toast("Adicionado à sua sacola ✧");
}
function renderCart() {
  const box = $("cartItems");
  if (!cart.length) { box.innerHTML='<p class="muted">Sua sacola está vazia. Encontre uma peça para começar.</p>'; }
  else box.innerHTML = cart.map(item=>`<div class="cart-row">
    ${item.image?`<img class="cart-thumb" src="${escapeHtml(item.image)}" alt="">`:'<div class="cart-thumb"></div>'}
    <div><a href="/produto.html?slug=${encodeURIComponent(item.slug||"")}" class="product-title">${escapeHtml(item.title)}</a><small>${money(item.price)}</small><div class="qty-controls"><button data-qty="${escapeHtml(item.id)}" data-delta="-1">−</button><span>${item.quantity}</span><button data-qty="${escapeHtml(item.id)}" data-delta="1">+</button></div></div>
    <button class="close-btn" data-remove="${escapeHtml(item.id)}" aria-label="Remover">×</button>
  </div>`).join("");
  $("cartTotal").textContent = money(cart.reduce((n,i)=>n+i.price*i.quantity,0));
}
function openCart(){ $("cartOverlay").classList.add("open"); $("cartDrawer").classList.add("open"); }
function closeCart(){ $("cartOverlay").classList.remove("open"); $("cartDrawer").classList.remove("open"); }
function orderMessage() {
  return "Olá! Quero fazer um pedido na Dudaocean:\n\n" + cart.map(i=>`• ${i.title} — ${i.quantity}x — ${money(i.price*i.quantity)}`).join("\n") + `\n\nSubtotal: ${money(cart.reduce((n,i)=>n+i.price*i.quantity,0))}\nGostaria de confirmar disponibilidade, frete e pagamento.`;
}
function whatsappOrder() {
  if (!cart.length) return toast("Sua sacola está vazia.");
  if (!WHATSAPP_NUMBER) return toast("Configure o número oficial do WhatsApp em public/app.js.");
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage())}`,"_blank","noopener");
}
async function checkout() {
  if (!cart.length) return toast("Sua sacola está vazia.");
  const btn = $("checkoutBtn"); btn.disabled = true; btn.textContent = "Preparando pagamento…";
  try {
    const response = await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:cart.map(i=>({id:i.id,quantity:i.quantity}))})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível iniciar o pagamento.");
    location.href = result.checkout_url;
  } catch (e) { toast(e.message); }
  finally { btn.disabled=false; btn.textContent="Finalizar compra ↗"; }
}
$("productGrid").addEventListener("click", e=>{
  const add=e.target.closest("[data-add]"); if(add) addToCart(add.dataset.add);
  const fav=e.target.closest("[data-favorite]"); if(fav) {
    const id=fav.dataset.favorite;
    if(favorites.has(String(id))) favorites.delete(String(id)); else favorites.add(String(id));
    localStorage.setItem("dudaocean_favorites",JSON.stringify([...favorites])); fav.textContent=favorites.has(String(id))?"♥":"♡";
  }
});
$("cartItems").addEventListener("click",e=>{
  const remove=e.target.closest("[data-remove]");
  if(remove){cart=cart.filter(i=>String(i.id)!==remove.dataset.remove);persistCart();return;}
  const qty=e.target.closest("[data-qty]");
  if(qty){const item=cart.find(i=>String(i.id)===qty.dataset.qty);if(item){item.quantity+=Number(qty.dataset.delta);if(item.quantity<=0)cart=cart.filter(i=>i!==item);persistCart();}}
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
$("accountBtn").addEventListener("click",()=>{$("accountModal").classList.add("open");});
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close).classList.remove("open")));
$("accountModal").addEventListener("click",e=>{if(e.target===$("accountModal"))$("accountModal").classList.remove("open");});
$("signupBtn").addEventListener("click",()=>{
  document.querySelectorAll(".signup-only").forEach(x=>x.classList.toggle("hidden"));
  const signupMode = !$("authName").required;
  $("authName").required = signupMode;
  $("authPhone").required = signupMode;
  $("authPhone").autocomplete = signupMode ? "tel" : "off";
  $("loginBtn").classList.toggle("hidden");
  $("signupBtn").textContent = signupMode ? "Voltar para entrar" : "Criar conta";
  $("authPassword").autocomplete = signupMode ? "new-password" : "current-password";
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
  const signupMode=$("authName").required;
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
      msg.textContent="Conta criada! Você já está conectado.";
    }else if(signupMode){
      msg.textContent="Cadastro enviado. Confira seu e-mail para confirmar a conta, se solicitado.";
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
