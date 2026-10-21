require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

const app = express();
const PORT = process.env.PORT || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!supabaseUrl || !serviceKey) {
  console.warn("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.");
}
const supabaseAdmin = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  : null;
const mp = mpToken ? new MercadoPagoConfig({ accessToken: mpToken }) : null;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function requireConfig(res) {
  if (!supabaseAdmin) {
    res.status(503).json({ error: "Servidor ainda não configurado com Supabase." });
    return false;
  }
  return true;
}

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "Dudaocean" }));

app.get("/api/products", async (req, res) => {
  if (!requireConfig(res)) return;
  const category = String(req.query.category || "").trim();
  const search = String(req.query.q || "").trim();
  let query = supabaseAdmin.from("products")
    .select("id,slug,title,description,price,compare_at_price,category,images,video_url,stock,active,created_at")
    .eq("active", true).order("created_at", { ascending: false });
  if (category && category !== "Todos") query = query.eq("category", category);
  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: "Não foi possível carregar os produtos." });
  res.json({ products: data || [] });
});

app.get("/api/products/:slug", async (req, res) => {
  if (!requireConfig(res)) return;
  const { data, error } = await supabaseAdmin.from("products")
    .select("id,slug,title,description,price,compare_at_price,category,images,video_url,stock,active,created_at")
    .eq("slug", req.params.slug).eq("active", true).maybeSingle();
  if (error) return res.status(500).json({ error: "Erro ao consultar produto." });
  if (!data) return res.status(404).json({ error: "Produto não encontrado." });
  const reviews = await supabaseAdmin.from("reviews")
    .select("id,rating,comment,created_at,display_name,verified_purchase")
    .eq("product_id", data.id).eq("approved", true).order("created_at", { ascending: false }).limit(30);
  res.json({ product: data, reviews: reviews.data || [] });
});

/*
 * Checkout cria preferência no servidor; o preço é consultado no banco.
 * O front-end nunca define o valor final do produto.
 */
app.post("/api/checkout", async (req, res) => {
  if (!requireConfig(res)) return;
  if (!mp) return res.status(503).json({ error: "Configure o token do Mercado Pago no servidor." });
  const itemsIn = Array.isArray(req.body.items) ? req.body.items : [];
  if (!itemsIn.length || itemsIn.length > 30) return res.status(400).json({ error: "Carrinho inválido." });

  const quantities = new Map();
  for (const item of itemsIn) {
    const id = String(item.id || "");
    const qty = Number(item.quantity);
    if (!id || !Number.isInteger(qty) || qty < 1 || qty > 20) {
      return res.status(400).json({ error: "Produto ou quantidade inválida." });
    }
    quantities.set(id, (quantities.get(id) || 0) + qty);
  }
  const ids = [...quantities.keys()];
  const { data: products, error } = await supabaseAdmin.from("products")
    .select("id,title,price,stock,active").in("id", ids);
  if (error || !products || products.length !== ids.length) return res.status(400).json({ error: "Um ou mais produtos não estão disponíveis." });

  const preferenceItems = [];
  for (const p of products) {
    const quantity = quantities.get(p.id);
    if (!p.active || p.stock < quantity || Number(p.price) <= 0) {
      return res.status(409).json({ error: `Estoque insuficiente ou produto indisponível: ${p.title}` });
    }
    preferenceItems.push({
      id: p.id, title: p.title, quantity,
      unit_price: Number(p.price), currency_id: "BRL"
    });
  }

  const origin = (process.env.SITE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  try {
    const pref = await new Preference(mp).create({
      body: {
        items: preferenceItems,
        back_urls: {
          success: `${origin}/?pagamento=sucesso`,
          failure: `${origin}/?pagamento=falhou`,
          pending: `${origin}/?pagamento=pendente`
        },
        auto_return: "approved",
        notification_url: `${origin}/api/mercadopago/webhook`,
        metadata: { product_ids: ids.join(",") }
      }
    });
    res.json({ checkout_url: pref.init_point, sandbox_url: pref.sandbox_init_point });
  } catch (e) {
    console.error("Mercado Pago preference error:", e.message);
    res.status(502).json({ error: "Não foi possível iniciar o pagamento. Tente novamente." });
  }
});

/*
 * Webhook: consulte o pagamento na API do Mercado Pago antes de confiar no status.
 * Configure/valide a assinatura do webhook no painel do Mercado Pago antes de produção.
 */
app.post("/api/mercadopago/webhook", async (req, res) => {
  if (!mp || !supabaseAdmin) return res.sendStatus(503);
  const paymentId = req.query["data.id"] || req.body?.data?.id;
  const type = req.query.type || req.body?.type;
  if (type !== "payment" || !paymentId) return res.sendStatus(200);
  try {
    const payment = await new Payment(mp).get({ id: String(paymentId) });
    if (payment.status === "approved") {
      // Registra o evento para auditoria; a reconciliação do pedido deve ser feita por ID externo.
      await supabaseAdmin.from("payment_events").upsert({
        payment_id: String(payment.id),
        status: payment.status,
        external_reference: payment.external_reference || null,
        payload: { status: payment.status, transaction_amount: payment.transaction_amount }
      }, { onConflict: "payment_id" });
    } else {
      await supabaseAdmin.from("payment_events").upsert({
        payment_id: String(payment.id),
        status: payment.status || "unknown",
        external_reference: payment.external_reference || null,
        payload: { status: payment.status || "unknown" }
      }, { onConflict: "payment_id" });
    }
    res.sendStatus(200);
  } catch (e) {
    console.error("Webhook error:", e.message);
    res.sendStatus(500);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Dudaocean disponível em http://localhost:${PORT}`);
});
