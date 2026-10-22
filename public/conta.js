(() => {
"use strict";
const SUPABASE_URL = 'https://mwfpezbntlyjnmficqsp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13ZnBlemJudGx5am5tZmljcXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjM3NjYsImV4cCI6MjEwODE5OTc2Nn0.LlouHqn9zKYBKU6uvvZFGt7teuy0Vayrnug11m9y63I';
const client = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
let mode = "login";
let user = null;
let toastTimer;

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}
function favIds() {
  try { return JSON.parse(localStorage.getItem("dudaocean_favorites") || "[]").map(String); }
  catch { return []; }
}
function setView(authed) {
  $("authView").classList.toggle("hidden", authed);
  $("dashboard").classList.toggle("hidden", !authed);
  if (authed && user) {
    const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "cliente";
    $("welcomeTitle").textContent = `Olá, ${name}`;
    $("welcomeEmail").textContent = user.email || "";
    showTab("inicio");
  }
}
function switchMode(next) {
  mode = next;
  const signup = mode === "signup";
  $("nameWrap").classList.toggle("hidden", !signup);
  $("phoneWrap").classList.toggle("hidden", !signup);
  $("fullName").required = signup;
  $("phone").required = signup;
  $("authEyebrow").textContent = signup ? "É BOM TER VOCÊ AQUI" : "BEM-VINDA DE VOLTA";
  $("authTitle").textContent = signup ? "Crie sua conta" : "Entre na sua conta";
  $("authDescription").textContent = signup ? "Seus favoritos e informações em um só lugar." : "Acesse seu espaço pessoal.";
  $("submitAuth").textContent = signup ? "Criar minha conta" : "Entrar";
  $("password").autocomplete = signup ? "new-password" : "current-password";
  $("toggleMode").textContent = signup ? "Já tem conta? Entrar" : "Ainda não tem conta? Criar conta";
  $("authMessage").textContent = "";
}
$("toggleMode").addEventListener("click", () => switchMode(mode === "login" ? "signup" : "login"));

$("authForm").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("submitAuth"), msg = $("authMessage");
  if (!client) { msg.textContent = "Não foi possível iniciar a conexão com a conta."; return; }
  btn.disabled = true;
  msg.textContent = mode === "signup" ? "Criando sua conta…" : "Entrando…";
  const email = $("email").value.trim();
  const password = $("password").value;
  try {
    let result;
    if (mode === "signup") {
      result = await client.auth.signUp({
        email, password,
        options: { data: {
          full_name: $("fullName").value.trim(),
          phone: $("phone").value.trim()
        }}
      });
    } else {
      result = await client.auth.signInWithPassword({ email, password });
    }
    if (result.error) throw result.error;
    if (result.data?.session?.user) {
      user = result.data.session.user;
      setView(true);
      if (mode === "signup") toast("Seja muito bem-vinda à DudaOcean! ✧");
      else toast("Login realizado com sucesso.");
    } else if (mode === "signup") {
      msg.textContent = "Cadastro recebido, mas o Supabase ainda não iniciou uma sessão. Verifique se a confirmação de e-mail está desativada.";
    } else {
      msg.textContent = "Login concluído, mas não foi possível recuperar a sessão. Tente novamente.";
    }
  } catch (err) {
    msg.textContent = err?.message || "Não foi possível entrar. Tente novamente.";
  } finally {
    btn.disabled = false;
  }
});

async function showTab(tab) {
  document.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  requestAnimationFrame(() => {
    const content = document.getElementById("tabContent");
    if (content) content.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const box = $("tabContent");
  const name = user?.user_metadata?.full_name || "";
  const favorites = favIds();

  if (tab === "inicio") {
    box.innerHTML = `<h2>Visão geral</h2><p class="muted">Seu espaço pessoal para acompanhar suas escolhas.</p>
      <div class="stats"><div class="stat"><strong>${favorites.length}</strong><span>Favoritos salvos neste navegador</span></div>
      <div class="stat"><strong>${name ? "✓" : "—"}</strong><span>Perfil ${name ? "com nome cadastrado" : "a completar"}</span></div></div>
      <h3>Um espaço feito para você</h3><p class="muted">Veja seus favoritos, atualize seus dados e continue explorando a loja.</p>
      <div class="action-row"><button class="outline" data-jump="favoritos">Ver favoritos</button><button class="outline" data-jump="dados">Atualizar meus dados</button><a class="outline" href="/">Voltar às compras</a></div>`;
    return;
  }
  if (tab === "dados") {
    box.innerHTML = `<h2>Meus dados</h2><p class="muted">Atualize as informações básicas do seu perfil.</p>
      <form id="profileForm" class="profile-form">
      <label>Nome completo<input id="profileName" required value="${esc(name)}" autocomplete="name"></label>
      <label>Telefone<input id="profilePhone" value="${esc(user?.user_metadata?.phone || "")}" autocomplete="tel"></label>
      <label>E-mail<input value="${esc(user?.email || "")}" disabled></label>
      <button class="primary" type="submit">Salvar alterações</button><p id="profileMessage" class="message"></p></form>`;
    $("profileForm").addEventListener("submit", async e => {
      e.preventDefault();
      const m = $("profileMessage");
      const { error } = await client.auth.updateUser({ data: {
        full_name: $("profileName").value.trim(),
        phone: $("profilePhone").value.trim()
      }});
      if (error) m.textContent = error.message;
      else {
        const { data } = await client.auth.getUser();
        user = data.user || user;
        m.textContent = "Seus dados foram atualizados.";
        $("welcomeTitle").textContent = `Olá, ${user.user_metadata?.full_name || "cliente"}`;
        toast("Dados atualizados.");
      }
    });
    return;
  }
  if (tab === "favoritos") {
    box.innerHTML = `<h2>Meus favoritos</h2><p class="muted">Os produtos que você marcou com o coração na loja aparecem aqui.</p><div id="favoriteProducts" class="product-list"><div class="empty">Carregando favoritos…</div></div>`;
    await renderFavorites();
    return;
  }
  if (tab === "enderecos") {
    const key = "dudaocean_addresses_" + user.id;
    let addresses = [];
    try { addresses = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}
    box.innerHTML = `<h2>Meus endereços</h2><p class="muted">Endereços salvos neste dispositivo.</p>
      <form id="addressForm" class="profile-form">
      <label>Identificação<input id="addressLabel" placeholder="Ex.: Minha casa" required></label>
      <label>Rua e número<input id="addressStreet" required placeholder="Rua, número"></label>
      <label>Bairro<input id="addressNeighborhood" required></label>
      <label>Complemento (opcional)<input id="addressComplement"></label>
      <button class="primary">Salvar endereço</button></form><div class="product-list" style="margin-top:20px">${
      addresses.length ? addresses.map((a,i)=>`<div class="product-item"><strong>${esc(a.label)}</strong><p>${esc(a.street)} · ${esc(a.neighborhood)}${a.complement ? " · "+esc(a.complement) : ""}</p><button data-remove-address="${i}">Remover</button></div>`).join("") : '<div class="empty">Você ainda não salvou endereços.</div>'
      }</div>`;
    $("addressForm").addEventListener("submit", e => {
      e.preventDefault();
      addresses.push({label:$("addressLabel").value.trim(),street:$("addressStreet").value.trim(),neighborhood:$("addressNeighborhood").value.trim(),complement:$("addressComplement").value.trim()});
      localStorage.setItem(key, JSON.stringify(addresses));
      showTab("enderecos");
      toast("Endereço salvo neste dispositivo.");
    });
    box.querySelectorAll("[data-remove-address]").forEach(b=>b.addEventListener("click",()=>{
      addresses.splice(Number(b.dataset.removeAddress),1);
      localStorage.setItem(key,JSON.stringify(addresses));
      showTab("enderecos");
    }));
    return;
  }
  if (tab === "pedidos") {
    box.innerHTML = `<h2>Meus pedidos</h2><div class="empty">Seus pedidos aparecerão aqui quando o sistema de compras registrar pedidos reais vinculados à sua conta.</div>`;
    return;
  }
  if (tab === "seguranca") {
    box.innerHTML = `<h2>Segurança</h2><p class="muted">Seu acesso é gerenciado pelo Supabase.</p>
      <div class="product-item"><strong>E-mail da conta</strong><p>${esc(user?.email || "")}</p></div>
      <div class="action-row"><button class="outline" id="resetPassword">Enviar link para redefinir senha</button></div><p id="securityMessage" class="message"></p>`;
    $("resetPassword").addEventListener("click", async()=>{
      const {error}=await client.auth.resetPasswordForEmail(user.email,{redirectTo:location.origin+"/conta.html"});
      $("securityMessage").textContent=error ? error.message : "Se o serviço estiver habilitado, você receberá as instruções de redefinição.";
    });
    return;
  }
}
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

async function renderFavorites() {
  const host = $("favoriteProducts");
  const ids = favIds();
  if (!ids.length) { host.innerHTML = '<div class="empty">Você ainda não favoritou nenhum produto.<br>Volte à loja e toque no coração das peças que gostar.</div>'; return; }
  let products = [];
  try {
    const r = await fetch("/api/products");
    if (r.ok) { const data = await r.json(); products = data.products || data || []; }
  } catch {}
  if (!Array.isArray(products) || !products.length) {
    try {
      const r = await fetch("/demo-products.js");
      const t = await r.text();
      const match = t.match(/(?:window\.)?DEMO_PRODUCTS\s*=\s*(\[[\s\S]*?\]);/);
      if (match) products = JSON.parse(match[1]);
    } catch {}
  }
  const chosen = products.filter(p => ids.includes(String(p.id)));
  if (!chosen.length) {
    host.innerHTML = `<div class="empty">Você tem ${ids.length} favorito(s) salvo(s), mas a loja não disponibilizou os detalhes desses produtos nesta página.</div>`;
    return;
  }
  host.innerHTML = chosen.map(p => `<article class="product-item"><strong>${esc(p.name || p.title || p.nome || "Produto favorito")}</strong><p>${p.price != null ? esc(typeof p.price === "number" ? p.price.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}) : p.price) : "Produto da loja"}</p><button data-unfavorite="${esc(p.id)}">Remover dos favoritos</button></article>`).join("");
  host.querySelectorAll("[data-unfavorite]").forEach(b=>b.addEventListener("click",()=>{
    const updated=favIds().filter(id=>id!==String(b.dataset.unfavorite));
    localStorage.setItem("dudaocean_favorites",JSON.stringify(updated));
    showTab("favoritos");
  }));
}

document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.tab)));
$("tabContent").addEventListener("click",e=>{
  const b=e.target.closest("[data-jump]");
  if(b)showTab(b.dataset.jump);
});
$("signOut").addEventListener("click",async()=>{
  const {error}=await client.auth.signOut();
  if(error){toast(error.message);return;}
  user=null;setView(false);switchMode("login");toast("Você saiu da sua conta.");
});
$("forgotPassword").addEventListener("click",async()=>{
  const email=$("email").value.trim();
  if(!email){$("authMessage").textContent="Informe seu e-mail primeiro.";return;}
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+"/conta.html"});
  $("authMessage").textContent=error ? error.message : "Se a solicitação for aceita, você receberá as instruções de redefinição.";
});

if (!client) {
  $("authMessage").textContent = "Não foi possível iniciar a conexão com o Supabase. Confira a conexão da página.";
} else {
  client.auth.getSession().then(({data,error})=>{
    if(error){$("authMessage").textContent=error.message;return;}
    user=data.session?.user||null;
    setView(Boolean(user));
  });
  client.auth.onAuthStateChange((event,session)=>{
    user=session?.user||null;
    if(event==="SIGNED_IN" && user) setView(true);
    if(event==="SIGNED_OUT") setView(false);
  });
}
})();
