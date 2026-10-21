const money=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const WA_NUMBER="";
let product=null, images=[], currentImage=0;
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
async function init(){
 const slug=new URLSearchParams(location.search).get("slug");
 if(!slug){$("productDetail").innerHTML="<p>Produto não informado. <a href='/'>Voltar à loja</a></p>";return}
 try{
  const r=await fetch("/api/products/"+encodeURIComponent(slug));const data=await r.json();if(!r.ok)throw Error(data.error||"Produto não encontrado");
  product=data.product;images=Array.isArray(product.images)?product.images:[];
  document.title=product.title+" | Dudaocean";
  const main=images[0]?`<img id="mainPhoto" src="${esc(images[0])}" alt="${esc(product.title)}">`:`<div class="photo-placeholder">✧</div>`;
  $("productDetail").innerHTML=`<div class="breadcrumbs"><a href="/">Início</a> / <a href="/#produtos">${esc(product.category||"Acessórios")}</a> / ${esc(product.title)}</div>
  <div class="detail-grid"><div><div class="gallery-main" id="galleryMain">${main}</div><div class="gallery-thumbs">${images.map((im,i)=>`<button class="${i===0?"active":""}" data-image="${i}"><img src="${esc(im)}" alt="Imagem ${i+1}"></button>`).join("")}</div>${product.video_url?`<p><a target="_blank" rel="noopener" href="${esc(product.video_url)}">▶ Assistir vídeo do produto</a></p>`:""}</div>
  <div class="detail-info"><span class="eyebrow">${esc(product.category||"COLEÇÃO DUDaocean")}</span><h1>${esc(product.title)}</h1><div class="detail-price">${money(product.price)} ${product.compare_at_price?`<span class="detail-old">${money(product.compare_at_price)}</span>`:""}</div><div class="stock-label">${Number(product.stock)>0?`${Number(product.stock)} unidade(s) disponível(is)`:"Produto esgotado"}</div><div class="detail-description">${esc(product.description||"Entre em contato para saber mais sobre esta peça.")}</div><div class="detail-actions"><button class="btn btn-dark" id="addDetail" ${Number(product.stock)<=0?"disabled":""}>Adicionar à sacola</button><button class="btn btn-light" id="buyWhats">Comprar pelo WhatsApp ↗</button></div><p class="tiny">Disponibilidade e prazo de entrega devem ser confirmados antes da conclusão do pedido.</p></div></div>`;
  $("galleryMain").addEventListener("click",()=>{const im=$("mainPhoto");if(im){const z=document.createElement("div");z.className="zoom-backdrop";z.innerHTML=`<button aria-label="Fechar">×</button><img src="${esc(im.src)}" alt="${esc(product.title)}">`;z.addEventListener("click",()=>z.remove());document.body.appendChild(z)}});
  document.querySelector(".gallery-thumbs").addEventListener("click",e=>{const b=e.target.closest("[data-image]");if(!b)return;currentImage=Number(b.dataset.image);$("mainPhoto").src=images[currentImage];document.querySelectorAll("[data-image]").forEach(x=>x.classList.toggle("active",x===b))});
  $("addDetail").addEventListener("click",()=>addCart(product));
  $("buyWhats").addEventListener("click",()=>{if(!WA_NUMBER)return toast("Configure o número do WhatsApp em public/product.js.");window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Olá! Tenho interesse em ${product.title} (${money(product.price)}). Ainda está disponível?`)}`,"_blank","noopener")});
  if(data.reviews?.length){$("reviewSection").classList.remove("hidden");$("reviewList").innerHTML=data.reviews.map(rv=>`<article class="review-card"><div class="review-name">${esc(rv.display_name||"Cliente")}</div><div class="review-stars">${"★".repeat(Math.max(0,Math.min(5,Number(rv.rating)||0)))}${"☆".repeat(5-Math.max(0,Math.min(5,Number(rv.rating)||0)))}</div><p>${esc(rv.comment||"")}</p>${rv.verified_purchase?'<small>Compra verificada</small>':""}</article>`).join("")}
 }catch(e){$("productDetail").innerHTML=`<div class="detail-loading"><h2>Não encontramos essa peça</h2><p>${esc(e.message)}</p><a class="btn btn-dark" href="/">Voltar à loja</a></div>`}
}
function addCart(p){
 let cart=JSON.parse(localStorage.getItem("dudaocean_cart")||"[]"),item=cart.find(x=>String(x.id)===String(p.id));
 if(item){if(item.quantity>=Number(p.stock))return toast("Estoque disponível já está na sacola.");item.quantity++}
 else cart.push({id:p.id,slug:p.slug,title:p.title,price:Number(p.price),image:(p.images||[])[0]||"",quantity:1});
 localStorage.setItem("dudaocean_cart",JSON.stringify(cart));toast("Adicionado à sacola. Volte à loja para finalizar.");
}
init();