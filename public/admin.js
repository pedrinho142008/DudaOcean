const SUPABASE_URL="https://mwfpezbntlyjnmficqsp.supabase.co";const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13ZnBlemJudGx5am5tZmljcXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjM3NjYsImV4cCI6MjEwODE5OTc2Nn0.LlouHqn9zKYBKU6uvvZFGt7teuy0Vayrnug11m9y63I";
const sb=(SUPABASE_URL&&SUPABASE_ANON_KEY&&window.supabase)?window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
const $=id=>document.getElementById(id);
const money=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let allProducts=[];

async function adminApi(method,id,body){
 const {data,error}=await sb.auth.getSession();
 const token=data?.session?.access_token;
 if(error||!token)throw new Error("Sessão expirada. Entre novamente.");
 const options={method,headers:{Authorization:"Bearer "+token}};
 if(body!==undefined){options.headers["Content-Type"]="application/json";options.body=JSON.stringify(body);}
 const response=await fetch("/api/admin/products/"+encodeURIComponent(id),options);
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(result.error||"Falha na operação administrativa.");
 return result;
}

let selectedMedia=[];
const MEDIA_BUCKET="product-media";

async function isAdmin(user){
 if(!sb||!user?.email)return false;
 const email=user.email.trim().toLowerCase();
 const {data,error}=await sb.from("admins").select("email").ilike("email",email).limit(1);
 if(error){console.error("Erro ao verificar administrador:",error);return false}
 return Array.isArray(data)&&data.length>0;
}
function msg(id,text){const el=$(id);if(el)el.textContent=text}
function toastAdmin(text){const t=$("toast");if(!t)return;t.textContent=text;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function goTo(page){
 document.querySelectorAll("[data-section]").forEach(s=>s.classList.toggle("hidden",s.dataset.section!==page));
 document.querySelectorAll(".admin-nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 if(page==="products")renderProducts();
 if(page==="promotions")renderPromotions();
 if(page==="stock")renderStock();
 window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>goTo(b.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>goTo(b.dataset.goto)));

async function requireAdmin(){
 if(!sb){$("adminLogin").classList.remove("hidden");msg("adminLoginMsg","Não foi possível iniciar o Supabase. Confira a configuração.");return}
 const {data}=await sb.auth.getSession();
 if(data.session&&await isAdmin(data.session.user)){showAdmin();return}
 $("adminLogin").classList.remove("hidden");$("adminApp").classList.add("hidden");
}
function showAdmin(){
 $("adminLogin").classList.add("hidden");$("adminApp").classList.remove("hidden");$("adminLogout").classList.remove("hidden");refresh();
}
$("adminLoginForm").addEventListener("submit",async e=>{
 e.preventDefault();
 if(!sb)return msg("adminLoginMsg","Não foi possível conectar ao Supabase.");
 const username=$("adminUsername").value.trim();
 if(username.toLowerCase()!=="dudaoceanoficial")return msg("adminLoginMsg","Usuário ou senha inválidos.");
 const {data,error}=await sb.auth.signInWithPassword({email:"mariaeduardachagas603@gmail.com",password:$("adminPassword").value});
 if(error)return msg("adminLoginMsg","Usuário ou senha inválidos.");
 if(!await isAdmin(data.user)){await sb.auth.signOut();return msg("adminLoginMsg","Conta sem autorização administrativa.")}
 showAdmin();
});
$("adminLogout").addEventListener("click",async()=>{if(sb)await sb.auth.signOut();$("adminApp").classList.add("hidden");$("adminLogout").classList.add("hidden");$("adminLogin").classList.remove("hidden");$("adminPassword").value=""});
if(sb)sb.auth.onAuthStateChange((_event,session)=>{if(!session){$("adminApp").classList.add("hidden");$("adminLogout").classList.add("hidden")}});

function makeSlug(title){return title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}

$("pMedia").addEventListener("change",()=>{
 selectedMedia=Array.from($("pMedia").files||[]).filter(f=>f.type.startsWith("image/"));
 const preview=$("mediaPreview");preview.innerHTML="";
 selectedMedia.forEach(file=>{
   const box=document.createElement("div");box.className="media-preview-item";
   const media=document.createElement("img");
   const url=URL.createObjectURL(file);
   media.src=url;media.alt=file.name;
   media.onload=()=>URL.revokeObjectURL(url);
   const name=document.createElement("span");name.textContent=file.name;
   box.append(media,name);preview.append(box);
 });
 if(($("pMedia").files||[]).length!==selectedMedia.length)
   msg("productMsg","Por enquanto, selecione somente fotos.");
});
function resetProductForm(){
 $("productForm").reset();$("pId").value="";$("pStock").value="1";$("pActive").checked=true;
 $("pMedia").value="";selectedMedia=[];$("mediaPreview").innerHTML="";$("existingMedia").innerHTML="";
 $("productFormHeading").textContent="Adicionar produto";$("saveProductBtn").textContent="Salvar produto";
 $("cancelEditBtn").classList.add("hidden");msg("productMsg","");
}
$("cancelEditBtn").addEventListener("click",resetProductForm);

async function compressImage(file){
 if(!file.type.startsWith("image/"))throw new Error("Envie somente fotos.");
 if(file.size<=900*1024||typeof createImageBitmap!=="function")return file;
 let bitmap;
 try{bitmap=await createImageBitmap(file)}catch{return file}
 try{
   const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));
   if(scale===1&&file.size<=1.5*1024*1024)return file;
   const canvas=document.createElement("canvas");
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));
   canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const ctx=canvas.getContext("2d");
   if(!ctx)return file;
   ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",0.84));
   if(!blob||!blob.size)return file;
   const type=blob.type||"image/jpeg";
   const ext=type==="image/webp"?".webp":".jpg";
   return new File([blob],file.name.replace(/\.[^.]+$/,"")+ext,
     {type,lastModified:Date.now()});
 }finally{bitmap.close?.()}
}

async function uploadMedia(files,slug){
 const images=Array.from(files||[]);
 if(images.some(f=>!f.type.startsWith("image/")))
   throw new Error("Por enquanto, envie somente fotos.");
 if(!images.length)return [];
 msg("productMsg","Preparando fotos...");
 const prepared=[];
 for(const file of images)prepared.push(await compressImage(file));

 const urls=new Array(prepared.length);
 let next=0,done=0;
 async function worker(){
   while(true){
     const i=next++;
     if(i>=prepared.length)return;
     const file=prepared[i];
     const clean=file.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
       .replace(/[^a-zA-Z0-9._-]/g,"-");
     const path=`${slug}/${Date.now()}-${i}-${Math.random().toString(36).slice(2,8)}-${clean}`;
     const result=await sb.storage.from(MEDIA_BUCKET).upload(
       path,file,{upsert:false,contentType:file.type}
     );
     if(result.error)throw new Error(`Falha ao enviar "${images[i].name}": ${result.error.message}`);
     const {data}=sb.storage.from(MEDIA_BUCKET).getPublicUrl(path);
     urls[i]={url:data.publicUrl,video:false};
     msg("productMsg",`Enviando fotos (${++done}/${prepared.length})...`);
   }
 }
 const results=await Promise.allSettled(
   Array.from({length:Math.min(3,prepared.length)},()=>worker())
 );
 const failed=results.find(r=>r.status==="rejected");
 if(failed)throw failed.reason;
 return urls;
}

function currentMediaFromProduct(p){
 const images=Array.isArray(p.images)?p.images:[];
 const media=images.map(x=>typeof x==="string"?{url:x,video:false}:x).filter(x=>x&&x.url);
 if(p.video_url&&!media.some(m=>m.url===p.video_url)) media.unshift({url:p.video_url,video:true});
 return media;
}

$("productForm").addEventListener("submit",async e=>{
 e.preventDefault();
 if(!sb)return msg("productMsg","Supabase não configurado.");
 const {data:session}=await sb.auth.getSession();
 if(!session.session||!await isAdmin(session.session.user))return msg("productMsg","Acesso administrativo não autorizado.");
 const id=$("pId").value;
 const title=$("pTitle").value.trim();
 const slug=makeSlug(title);
 if(!slug)return msg("productMsg","Informe um nome válido para o produto.");
 const old=allProducts.find(p=>String(p.id)===String(id));
 msg("productMsg","Salvando produto e enviando arquivos...");
 $("saveProductBtn").disabled=true;
 try{
   const uploaded=await uploadMedia(selectedMedia,slug);
   const media=[...(old?currentMediaFromProduct(old):[]),...uploaded];
   const video=media.find(m=>m.video)?.url||null;
   const row={title,slug,category:$("pCategory").value,price:Number($("pPrice").value),compare_at_price:old?.compare_at_price??null,stock:Number($("pStock").value),images:media.filter(m=>!m.video).map(m=>m.url),video_url:video,description:$("pDescription").value.trim(),active:$("pActive").checked};
   const result=id?await sb.from("products").update(row).eq("id",id):await sb.from("products").insert(row);
   if(result.error)throw new Error(result.error.message);
   msg("productMsg",id?"Produto atualizado!":"Produto cadastrado com sucesso!");
   resetProductForm();await refresh();goTo("products");
 }catch(err){console.error(err);msg("productMsg",err.message||"Não foi possível salvar o produto.")}
 finally{$("saveProductBtn").disabled=false}
});

function imageFor(p){return Array.isArray(p.images)&&p.images.length?p.images[0]:null}
function isPromo(p){return Number(p.compare_at_price)>Number(p.price)}
function productCard(p){
 const img=imageFor(p);
 const cover=p.video_url
   ? `<video class="admin-product-video" src="${esc(p.video_url)}" autoplay muted loop playsinline preload="metadata"></video>`
   : img?`<img src="${esc(img)}" alt="" loading="lazy">`:'<div class="product-placeholder"></div>';
 return `<article class="admin-product">${cover}
 <div class="admin-product-info"><strong>${esc(p.title)}</strong><small>${money(p.price)}${isPromo(p)?` · preço anterior ${money(p.compare_at_price)}`:""}<br>Estoque: ${Math.max(0,Number(p.stock)||0)} · ${p.active?"Publicado":"Oculto"}${Number(p.stock)<=0?" · Sem estoque":""}</small></div>
 <div class="admin-product-actions"><button class="primary" data-edit="${esc(p.id)}" type="button">Editar</button><button data-toggle="${esc(p.id)}" data-active="${p.active}" type="button">${p.active?"Ocultar":"Publicar"}</button>${isPromo(p)?`<button data-endpromo="${esc(p.id)}" type="button">Encerrar desconto</button>`:""}<button class="danger" data-delete="${esc(p.id)}" type="button">Excluir</button></div></article>`;
}

function renderProducts(){
 const query=($("productSearch").value||"").trim().toLowerCase();
 const list=allProducts.filter(p=>String(p.title||"").toLowerCase().includes(query));
 $("adminProducts").innerHTML=list.length?list.map(productCard).join(""):"Nenhum produto encontrado.";
}
$("productSearch").addEventListener("input",renderProducts);
function renderPromotions(){
 const options=allProducts.filter(p=>p.active).map(p=>`<option value="${esc(p.id)}">${esc(p.title)}${isPromo(p)?" (em promoção)":""}</option>`).join("");
 $("promoProduct").innerHTML='<option value="">Selecione um produto</option>'+options;
 const promos=allProducts.filter(isPromo);
 $("adminPromotions").innerHTML=promos.length?promos.map(p=>`<div class="promo-item">${imageFor(p)?`<img src="${esc(imageFor(p))}" alt="">`:""}<div class="promo-item-info"><strong>${esc(p.title)}</strong><small><s>${money(p.compare_at_price)}</s> → <b>${money(p.price)}</b> · ${Math.max(0,Math.round((1-p.price/p.compare_at_price)*100))}% de desconto</small></div><button type="button" data-endpromo="${esc(p.id)}">Encerrar</button></div>`).join(""):"Nenhuma promoção ativa.";
 updatePromoCurrent();
}
function updatePromoCurrent(){
 const p=allProducts.find(x=>String(x.id)===$("promoProduct").value);
 $("promoCurrent").value=p?Number(p.price).toFixed(2):"";
 $("promoPrice").value="";
 $("promoPreview").textContent=p?"Preço atual: "+money(p.price)+". Digite o preço promocional para ver o desconto.":"Escolha um produto para calcular o desconto.";
}
$("promoProduct").addEventListener("change",updatePromoCurrent);
$("promoPrice").addEventListener("input",()=>{
 const p=allProducts.find(x=>String(x.id)===$("promoProduct").value),price=Number($("promoPrice").value);
 if(!p||!price)return $("promoPreview").textContent="Digite um preço promocional válido.";
 if(price>=Number(p.price))return $("promoPreview").textContent="O preço promocional precisa ser menor que "+money(p.price)+".";
 $("promoPreview").textContent=`De ${money(p.price)} por ${money(price)} — ${Math.round((1-price/p.price)*100)}% de desconto.`;
});
$("promotionForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const p=allProducts.find(x=>String(x.id)===$("promoProduct").value),price=Number($("promoPrice").value);
 if(!p)return msg("promoMsg","Escolha um produto.");
 if(!(price>0&&price<p.price))return msg("promoMsg","O preço promocional deve ser menor que o preço atual.");
 try {
   await adminApi("PATCH",p.id,{price,compare_at_price:isPromo(p)?p.compare_at_price:p.price});
 } catch(err) {
   return msg("promoMsg","Não foi possível aplicar a promoção: "+err.message);
 }
 msg("promoMsg","Promoção aplicada!");await refresh();renderPromotions();
});
async function endPromotion(id){
 const p=allProducts.find(x=>String(x.id)===String(id));
 if(!p||!isPromo(p))return;
 if(!confirm(`Encerrar a promoção de "${p.title}" e voltar ao preço de ${money(p.compare_at_price)}?`))return;
 try {
   await adminApi("PATCH",p.id,{price:Number(p.compare_at_price),compare_at_price:null});
 } catch(err) {
   return toastAdmin("Erro ao encerrar promoção: "+err.message);
 }
 await refresh();renderPromotions();toastAdmin("Promoção encerrada.");
}
function renderStock(){
 $("adminStock").innerHTML=allProducts.length?allProducts.map(p=>`<div class="admin-stock-row"><div><strong>${esc(p.title)}</strong><small>${Number(p.stock)<=0?"Esgotado":Number(p.stock)<=3?"Estoque baixo": "Em estoque"} · ${Number(p.stock)||0} unidade(s)</small></div><div class="stock-edit"><input type="number" min="0" step="1" value="${Number(p.stock)||0}" aria-label="Quantidade de ${esc(p.title)}" id="stock-${esc(p.id)}"><button type="button" data-stock="${esc(p.id)}">Salvar</button></div></div>`).join(""):"Nenhum produto cadastrado.";
}
let refreshInFlight = null;
async function refresh(){
 if(!sb)return;
 if(refreshInFlight)return refreshInFlight;
 refreshInFlight = (async () => {
 const {data:products,error}=await sb.from("products").select("id,title,slug,category,price,compare_at_price,stock,active,images,video_url,description,created_at").order("created_at",{ascending:false});
 if(error){msg("productMsg","Não foi possível carregar produtos: "+error.message);$("adminProducts").textContent="Não foi possível carregar os produtos.";return}
 allProducts=products||[];
 $("statProducts").textContent=allProducts.filter(p=>p.active).length;
 $("statStock").textContent=allProducts.reduce((n,p)=>n+Number(p.stock||0),0);
 $("statPromos").textContent=allProducts.filter(isPromo).length;
 $("statEmpty").textContent=allProducts.filter(p=>Number(p.stock||0)<=0).length;
 renderProducts();renderPromotions();renderStock();
 })();
 try { await refreshInFlight; }
 finally { refreshInFlight = null; }
}
$("refreshAdmin").addEventListener("click",refresh);
$("adminProducts").addEventListener("click",async e=>{
 const b=e.target.closest("button");if(!b)return;
 const id=b.dataset.edit||b.dataset.toggle||b.dataset.delete||b.dataset.endpromo;
 if(b.dataset.endpromo)return endPromotion(b.dataset.endpromo);
 const p=allProducts.find(x=>String(x.id)===String(id));if(!p)return;
 if(b.dataset.edit){
   $("pId").value=p.id;$("pTitle").value=p.title||"";$("pCategory").value=p.category||"Acessórios";
   $("pPrice").value=p.price;$("pStock").value=p.stock??0;$("pDescription").value=p.description||"";$("pActive").checked=!!p.active;
   $("existingMedia").innerHTML=currentMediaFromProduct(p).map(m=>`<div class="media-preview-item">${m.video?`<video src="${esc(m.url)}" muted></video>`:`<img src="${esc(m.url)}" alt="">`}<span>Já enviado</span></div>`).join("");
   $("productFormHeading").textContent="Editar produto";$("saveProductBtn").textContent="Salvar alterações";$("cancelEditBtn").classList.remove("hidden");$("pMedia").value="";selectedMedia=[];$("mediaPreview").innerHTML="";msg("productMsg","");
   goTo("add");return;
 }
 if(b.dataset.toggle){
   try {
     await adminApi("PATCH",p.id,{active:b.dataset.active!=="true"});
   } catch(err) {
     return toastAdmin("Não foi possível alterar: "+err.message);
   }
   await refresh();toastAdmin(p.active?"Produto ocultado.":"Produto publicado.");return;
 }
 if(b.dataset.delete){
   if(!confirm(`Excluir "${p.title}" permanentemente? Essa ação não pode ser desfeita.`))return;
   try {
     await adminApi("DELETE",p.id);
   } catch(err) {
     return toastAdmin("Não foi possível excluir: "+err.message);
   }
   await refresh();toastAdmin("Produto excluído.");
 }
});
$("adminPromotions").addEventListener("click",e=>{const b=e.target.closest("[data-endpromo]");if(b)endPromotion(b.dataset.endpromo)});
$("adminStock").addEventListener("click",async e=>{
 const b=e.target.closest("[data-stock]");if(!b)return;
 const id=b.dataset.stock,input=$("stock-"+id),stock=Number(input.value);
 if(!Number.isInteger(stock)||stock<0)return toastAdmin("Informe uma quantidade válida.");
 try {
   await adminApi("PATCH",id,{stock});
 } catch(err) {
   return toastAdmin("Não foi possível atualizar o estoque: "+err.message);
 }
 await refresh();toastAdmin("Estoque atualizado.");
});
requireAdmin();
