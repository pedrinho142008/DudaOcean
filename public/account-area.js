(()=>{
"use strict";
const $ = id => document.getElementById(id);
const client = window.dudaoceanSupabase;
const money = n => Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const escape = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let currentUser = null;
let currentTab = "inicio";
let accountProducts = [];

const tabs = [
["inicio","⌂","Visão geral"],["dados","♡","Meus dados"],["enderecos","⌖","Endereços"],
["favoritos","♡","Favoritos"],["pedidos","▤","Meus pedidos"],["cupons","％","Cupons e benefícios"],
["reposicao","◷","Reposição de estoque"],["avaliacoes","☆","Minhas avaliações"],["seguranca","◇","Segurança"]
];

function localKey(s){return "dudaocean_"+s+"_"+(currentUser?.id||"visitante")}
function readList(s){try{return JSON.parse(localStorage.getItem(localKey(s))||"[]")}catch{return []}}
function saveList(s,v){localStorage.setItem(localKey(s),JSON.stringify(v))}
function ensureDashboard(){
 if($("accountDashboard"))return;
 const backdrop=document.createElement("div");
 backdrop.className="modal-backdrop";
 backdrop.id="accountDashboardBackdrop";
 backdrop.innerHTML=`<section class="account-dashboard" id="accountDashboard" role="dialog" aria-modal="true" aria-label="Minha conta">
 <header class="account-top"><div><span class="account-kicker">DUDaOCEAN · ESPAÇO EXCLUSIVO</span><h2>Seu cantinho, seu estilo.</h2><p class="account-subtitle" id="accountIdentity">Gerencie seus dados e preferências.</p></div><button class="account-close" id="accountDashboardClose" aria-label="Fechar">×</button></header>
 <div class="account-layout"><nav class="account-nav" id="accountNav" aria-label="Abas da conta"></nav><main class="account-content" id="accountContent"></main></div>
 </section>`;
 document.body.appendChild(backdrop);
 backdrop.addEventListener("click",e=>{if(e.target===backdrop)closeDashboard()});
 $("accountDashboardClose").addEventListener("click",closeDashboard);
 $("accountNav").addEventListener("click",e=>{
  const b=e.target.closest("[data-account-tab]");if(b)showTab(b.dataset.accountTab);
 });
 $("accountContent").addEventListener("click",contentClick);
 $("accountContent").addEventListener("submit",contentSubmit);
}
function openDashboard(tab="inicio"){
 if(!currentUser){$("accountModal")?.classList.add("open");return}
 ensureDashboard();
 $("accountDashboardBackdrop").style.display="grid";
 $("accountDashboardBackdrop").classList.add("open");
 document.body.style.overflow="hidden";
 showTab(tab);
}
function closeDashboard(){
 const b=$("accountDashboardBackdrop");if(b){b.classList.remove("open");b.style.display="none"}
 document.body.style.overflow="";
}
function showTab(tab){
 currentTab=tab;
 $("accountNav").innerHTML=tabs.map(([id,ico,label])=>`<button type="button" class="account-tab ${id===tab?"active":""}" data-account-tab="${id}">${ico} &nbsp;${label}</button>`).join("");
 const name=currentUser?.user_metadata?.full_name||currentUser?.email?.split("@")[0]||"cliente";
 $("accountIdentity").textContent=`Olá, ${name}! Esta é sua área pessoal.`;
 const render={
 inicio:homeTab,dados:profileTab,enderecos:addressesTab,favoritos:favoritesTab,
 pedidos:()=>emptyTab("Meus pedidos","▤","Suas compras aparecerão aqui quando houver pedidos reais vinculados à sua conta."),
 cupons:()=>emptyTab("Cupons e benefícios","％","Seus cupons válidos aparecerão aqui quando estiverem disponíveis para sua conta."),
 reposicao:restockTab,
 avaliacoes:()=>emptyTab("Minhas avaliações","☆","Quando houver compras pagas elegíveis, você poderá avaliar os produtos adquiridos."),
 seguranca:securityTab
 };
 $("accountContent").innerHTML=(render[tab]||homeTab)();
}
function homeTab(){
 const favs=readList("favorites").length;
 const addresses=readList("addresses").length;
 return `<div class="account-welcome"><span class="account-kicker">BEM-VINDA À DUDaOCEAN</span><h3>Que bom ter você aqui ✧</h3><p>Seu estilo, suas escolhas e seus detalhes favoritos reunidos em um só lugar.</p></div>
 <div class="account-stats"><div class="account-stat"><strong>${favs}</strong><span>Produtos favoritos neste dispositivo</span></div><div class="account-stat"><strong>${addresses}</strong><span>Endereços salvos neste dispositivo</span></div></div>
 <h3>Por onde começar?</h3><p class="account-muted">Atualize seus dados, salve um endereço ou volte às peças que você amou.</p>
 <div class="account-actions"><button class="account-action" data-go-tab="dados">Meus dados</button><button class="account-action secondary" data-go-tab="favoritos">Ver favoritos</button><button class="account-action secondary" data-go-tab="enderecos">Meus endereços</button></div>`;
}
function profileTab(){
 const m=currentUser.user_metadata||{};
 return `<h3>Meus dados</h3><p class="account-muted">Mantenha suas informações atualizadas.</p>
 <form data-account-form="profile"><div class="account-fields">
 <label>Nome completo<input name="full_name" required maxlength="100" value="${escape(m.full_name||"")}"></label>
 <label>E-mail<input value="${escape(currentUser.email||"")}" disabled></label>
 <label>Telefone com DDD<input name="phone" type="tel" autocomplete="tel" value="${escape(m.phone||"")}"></label>
 </div><div class="account-actions"><button class="account-action" type="submit">Salvar meus dados</button></div><p class="account-notice" id="accountNotice"></p></form>
 <form data-account-form="password"><h3 style="margin-top:28px">Alterar senha</h3><div class="account-fields"><label>Nova senha<input name="new_password" type="password" minlength="8" required autocomplete="new-password"></label></div><button class="account-action secondary" type="submit">Atualizar senha</button><p class="account-notice" id="passwordNotice"></p></form>`;
}
function addressesTab(){
 const list=readList("addresses");
 return `<h3>Meus endereços</h3><p class="account-muted">Salve os endereços que costuma usar. Nesta versão, eles ficam guardados neste navegador.</p>
 <form data-account-form="address"><div class="account-fields">
 <label>Identificação<input name="label" placeholder="Ex.: Casa" maxlength="40" required></label>
 <label>Bairro<input name="bairro" maxlength="80" required></label>
 <label>Rua<input name="rua" maxlength="120" required></label>
 <label>Número<input name="numero" maxlength="20" required></label>
 <label>Complemento (opcional)<input name="complemento" maxlength="100"></label>
 </div><button class="account-action" type="submit">Salvar endereço</button><p class="account-notice" id="addressNotice"></p></form>
 <div class="account-list">${list.length?list.map((a,i)=>`<div class="account-list-item"><span><strong>${escape(a.label)}</strong><br>${escape(a.rua)}, ${escape(a.numero)} · ${escape(a.bairro)}${a.complemento?" · "+escape(a.complemento):""}</span><button type="button" data-delete-address="${i}">Excluir</button></div>`).join(""):'<div class="account-empty"><div class="account-symbol">⌖</div><strong>Nenhum endereço salvo</strong><p>Adicione seu primeiro endereço acima.</p></div>'}</div>`;
}
function favoritesTab(){
 const ids=readList("favorites").map(String);
 const list=accountProducts.filter(p=>ids.includes(String(p.id)));
 return `<h3>Seus favoritos</h3><p class="account-muted">Peças que você marcou com o coração.</p>${list.length?`<div class="account-list">${list.map(p=>`<div class="account-product">${p.images?.[0]?`<img src="${escape(p.images[0])}" alt="">`:'<div class="account-stat">♡</div>'}<div><strong>${escape(p.title)}</strong><small>${money(p.price)}</small><a href="/produto.html?slug=${encodeURIComponent(p.slug||"")}">Ver produto</a></div><button class="account-action secondary" data-unfavorite="${escape(p.id)}">Remover</button></div>`).join("")}</div>`:`<div class="account-empty"><div class="account-symbol">♡</div><strong>${ids.length?"Carregando seus favoritos":"Sua lista começa aqui"}</strong><p>Toque no coração de um produto para guardá-lo nesta lista.</p><div class="account-actions" style="justify-content:center"><button class="account-action" data-go-products>Explorar produtos</button></div></div>`}`;
}
function restockTab(){
 const list=readList("restock");
 return `<h3>Avisos de reposição</h3><p class="account-muted">Adicione produtos para acompanhar quando voltarem ao estoque. O aviso ainda não envia notificações automáticas.</p>
 <form data-account-form="restock"><div class="account-fields"><label>Nome do produto<input name="product" required maxlength="120" placeholder="Qual peça você procura?"></label><label>E-mail para aviso<input name="email" type="email" value="${escape(currentUser.email||"")}" required></label></div><button class="account-action" type="submit">Acompanhar produto</button><p class="account-notice" id="restockNotice"></p></form>
 <div class="account-list">${list.length?list.map((x,i)=>`<div class="account-list-item"><span>${escape(x.product)}<br><small>${escape(x.email)}</small></span><button data-delete-restock="${i}">Remover</button></div>`).join(""):'<div class="account-empty"><div class="account-symbol">◷</div><strong>Nenhum aviso cadastrado</strong><p>Adicione uma peça acima para manter sua lista organizada.</p></div>'}</div>`;
}
function emptyTab(title,symbol,description){
 return `<h3>${title}</h3><div class="account-empty"><div class="account-symbol">${symbol}</div><strong>Ainda não há informações por aqui</strong><p>${description}</p></div>`;
}
function securityTab(){
 return `<h3>Segurança e sessão</h3><p class="account-muted">Sua conta está conectada com o Supabase Authentication.</p><div class="account-list"><div class="account-list-item"><span>E-mail da conta<br><small>${escape(currentUser.email||"")}</small></span><span>●</span></div><div class="account-list-item"><span>Sessão atual<br><small>Você está conectado neste navegador.</small></span><span>✓</span></div></div><div class="account-actions"><button class="account-action account-danger" data-signout>Sair da conta</button></div><p class="account-notice" id="securityNotice"></p>`;
}
async function contentSubmit(e){
 const form=e.target.closest("form[data-account-form]");if(!form)return;
 e.preventDefault();
 const kind=form.dataset.accountForm;
 const data=Object.fromEntries(new FormData(form).entries());
 const notice=form.querySelector(".account-notice");
 try{
  if(kind==="profile"){
   const {error}=await client.auth.updateUser({data:{full_name:data.full_name.trim(),phone:data.phone.trim()}});
   if(error)throw error;
   currentUser=(await client.auth.getUser()).data.user;
   notice.textContent="Seus dados foram atualizados com sucesso.";
   $("accountIdentity").textContent=`Olá, ${currentUser.user_metadata?.full_name||currentUser.email}! Esta é sua área pessoal.`;
  }else if(kind==="password"){
   const {error}=await client.auth.updateUser({password:data.new_password});
   if(error)throw error;
   form.reset();notice.textContent="Senha atualizada com sucesso.";
  }else if(kind==="address"){
   const list=readList("addresses");list.push(data);saveList("addresses",list);showTab("enderecos");
   const n=$("addressNotice");if(n)n.textContent="Endereço salvo neste dispositivo.";
  }else if(kind==="restock"){
   const list=readList("restock");list.push({product:data.product.trim(),email:data.email.trim()});saveList("restock",list);showTab("reposicao");
   const n=$("restockNotice");if(n)n.textContent="Produto adicionado à sua lista.";
  }
 }catch(err){if(notice)notice.textContent=err.message||"Não foi possível salvar agora."}
}
async function contentClick(e){
 const go=e.target.closest("[data-go-tab]");
 if(go){showTab(go.dataset.goTab);return}
 if(e.target.closest("[data-go-products]")){closeDashboard();location.href="/#produtos";return}
 const un=e.target.closest("[data-unfavorite]");
 if(un){const ids=readList("favorites").filter(x=>String(x)!==un.dataset.unfavorite);saveList("favorites",ids);localStorage.setItem("dudaocean_favorites",JSON.stringify(ids));showTab("favoritos");return}
 const da=e.target.closest("[data-delete-address]");
 if(da){const list=readList("addresses");list.splice(Number(da.dataset.deleteAddress),1);saveList("addresses",list);showTab("enderecos");return}
 const dr=e.target.closest("[data-delete-restock]");
 if(dr){const list=readList("restock");list.splice(Number(dr.dataset.deleteRestock),1);saveList("restock",list);showTab("reposicao");return}
 if(e.target.closest("[data-signout]")){
  if(!client)return;
  const notice=$("securityNotice");
  const {error}=await client.auth.signOut();
  if(error){notice.textContent=error.message;return}
  closeDashboard();currentUser=null;toast("Você saiu da sua conta. Até breve! ✧");
 }
}
async function loadAccountProducts(){
 try{const r=await fetch("/api/products");if(r.ok){const d=await r.json();accountProducts=d.products||[]}}
 catch{}
 if(!accountProducts.length&&Array.isArray(window.DEMO_PRODUCTS))accountProducts=window.DEMO_PRODUCTS;
}
function onAuth(user){
 currentUser=user||null;
 if(currentUser){
  $("accountModal")?.classList.remove("open");
  const name=currentUser.user_metadata?.full_name||currentUser.email?.split("@")[0]||"cliente";
  toast(`Bem-vinda à DudaOcean, ${name}! ✧`);
  openDashboard("inicio");
 }else closeDashboard();
}
function start(){
 if(!client)return;
 client.auth.getSession().then(({data})=>{currentUser=data.session?.user||null});
 client.auth.onAuthStateChange((event,session)=>{
  if(event==="SIGNED_IN"&&session?.user)onAuth(session.user);
  if(event==="SIGNED_OUT"){currentUser=null;closeDashboard()}
 });
 $("accountBtn")?.addEventListener("click",async()=>{
  const {data}=await client.auth.getUser();
  currentUser=data.user||null;
  if(currentUser){await loadAccountProducts();openDashboard("inicio")}
 });
 $("authForm")?.addEventListener("submit",async()=>{
  // O formulário principal continua responsável pelo login/cadastro.
  // O listener de autenticação abre a área quando houver sessão.
  setTimeout(async()=>{
   const {data}=await client.auth.getSession();
   if(data.session?.user){currentUser=data.session.user;await loadAccountProducts();openDashboard("inicio")}
  },500);
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
