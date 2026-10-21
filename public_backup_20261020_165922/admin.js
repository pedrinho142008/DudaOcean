const SUPABASE_URL="";const SUPABASE_ANON_KEY="";
const sb=(SUPABASE_URL&&SUPABASE_ANON_KEY&&window.supabase)?window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
const $=id=>document.getElementById(id);
const money=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ADMIN_EMAILS=[]; // Preencha com os e-mails dos administradores autorizados.
function msg(id,text){$(id).textContent=text}
async function requireAdmin(){
 if(!sb){$("adminLogin").classList.remove("hidden");msg("adminLoginMsg","Configure SUPABASE_URL e SUPABASE_ANON_KEY neste arquivo.");return}
 const {data}=await sb.auth.getSession();
 if(data.session){const email=data.session.user.email;if(ADMIN_EMAILS.includes(email)){showAdmin();return}}
 $("adminLogin").classList.remove("hidden");$("adminApp").classList.add("hidden");
}
function showAdmin(){$("adminLogin").classList.add("hidden");$("adminApp").classList.remove("hidden");refresh()}
$("adminLoginForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!sb)return msg("adminLoginMsg","Configure o Supabase antes.");
 const {data,error}=await sb.auth.signInWithPassword({email:$("adminEmail").value.trim(),password:$("adminPassword").value});
 if(error)return msg("adminLoginMsg",error.message);
 if(!ADMIN_EMAILS.includes(data.user.email)){await sb.auth.signOut();return msg("adminLoginMsg","Esta conta não está autorizada para administração.")}
 showAdmin();
});
$("adminLogout").addEventListener("click",async()=>{if(sb)await sb.auth.signOut();$("adminApp").classList.add("hidden");$("adminLogin").classList.remove("hidden")});
$("pTitle").addEventListener("input",()=>{if(!$("pSlug").dataset.edited)$("pSlug").value=$("pTitle").value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")});
$("pSlug").addEventListener("input",()=>{$("pSlug").dataset.edited="1"});
$("productForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!sb)return msg("productMsg","Configure o Supabase antes de salvar.");
 const {data:session}=await sb.auth.getSession();if(!session.session||!ADMIN_EMAILS.includes(session.session.user.email))return msg("productMsg","Acesso administrativo não autorizado.");
 const images=$("pImages").value.split("\n").map(s=>s.trim()).filter(Boolean);
 const row={title:$("pTitle").value.trim(),slug:$("pSlug").value.trim(),category:$("pCategory").value,price:Number($("pPrice").value),compare_at_price:$("pCompare").value?Number($("pCompare").value):null,stock:Number($("pStock").value),images,video_url:$("pVideo").value.trim()||null,description:$("pDescription").value.trim(),active:$("pActive").checked};
 const {error}=await sb.from("products").insert(row);
 if(error)return msg("productMsg","Erro ao salvar: "+error.message);
 msg("productMsg","Produto cadastrado.");e.target.reset();$("pStock").value="1";$("pActive").checked=true;delete $("pSlug").dataset.edited;refresh();
});
$("refreshAdmin").addEventListener("click",refresh);
async function refresh(){
 if(!sb)return;
 const [{data:products,error:pe},{data:payments,error:payErr}] = await Promise.all([
  sb.from("products").select("id,title,slug,price,stock,active,images,created_at").order("created_at",{ascending:false}),
  sb.from("payment_events").select("payment_id,status").eq("status","approved")
 ]);
 if(pe){msg("productMsg","Não foi possível ler produtos: "+pe.message);return}
 $("statProducts").textContent=products.filter(p=>p.active).length;
 $("statStock").textContent=products.reduce((n,p)=>n+Number(p.stock||0),0);
 $("statOrders").textContent="—";
 $("statPayments").textContent=payErr?"—":(payments||[]).length;
 $("adminProducts").innerHTML=products.length?products.map(p=>`<article class="admin-product">${p.images?.[0]?`<img src="${esc(p.images[0])}" alt="">`:'<div></div>'}<div><strong>${esc(p.title)}</strong><small>${money(p.price)} · Estoque: ${p.stock} · ${p.active?"Publicado":"Oculto"}</small></div><button data-toggle="${esc(p.id)}" data-active="${p.active}">${p.active?"Ocultar":"Publicar"}</button></article>`).join(""):"Nenhum produto cadastrado.";
}
$("adminProducts").addEventListener("click",async e=>{
 const b=e.target.closest("[data-toggle]");if(!b||!sb)return;
 const {error}=await sb.from("products").update({active:b.dataset.active!=="true"}).eq("id",b.dataset.toggle);
 if(error)toastAdmin("Não foi possível alterar: "+error.message);else refresh();
});
function toastAdmin(t){msg("productMsg",t)}
if(sb)sb.auth.onAuthStateChange((_event,session)=>{if(!session)$("adminApp").classList.add("hidden")});
requireAdmin();
