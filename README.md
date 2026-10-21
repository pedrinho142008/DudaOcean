# Dudaocean — projeto completo inicial

Loja responsiva com identidade nude/bege/off-white/marrom, vitrine baseada em produtos publicados, busca, categorias, favoritos locais, sacola persistente, páginas individuais de produto, avaliações publicadas, cadastro/login Supabase, painel administrativo e início de integração com Mercado Pago.

## Requisitos
- Node.js 20 ou superior
- Projeto Supabase
- Conta Mercado Pago para obter token de acesso
- Um número oficial de WhatsApp (opcional)

## 1. Instalar e executar
1. Extraia o ZIP.
2. Copie `.env.example` para `.env`.
3. Preencha as variáveis de ambiente do servidor.
4. No terminal, dentro da pasta do projeto, execute:

```bash
npm install
npm start
```

Abra `http://localhost:3000`.

## 2. Supabase — tabelas
No painel do Supabase, abra SQL Editor e execute o SQL abaixo para criar as tabelas. Este texto está no README para facilitar a configuração; não existe um arquivo `.sql` separado.

```sql
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null default '',
  category text not null default 'Acessórios',
  price numeric(10,2) not null check (price > 0),
  compare_at_price numeric(10,2),
  stock integer not null default 0 check (stock >= 0),
  images jsonb not null default '[]'::jsonb,
  video_url text,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null default 'Cliente',
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  verified_purchase boolean not null default false,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  payment_id text primary key,
  status text not null,
  external_reference text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.reviews enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.payment_events enable row level security;

create policy "Produtos ativos visíveis publicamente"
on public.products for select to anon, authenticated using (active = true);

create policy "Avaliações aprovadas visíveis publicamente"
on public.reviews for select to anon, authenticated using (approved = true);

-- O painel abaixo usa a chave ANON no navegador. Para administrar, adicione
-- uma tabela admin_users e políticas restritas por auth.uid()/e-mail.
-- NÃO habilite escrita pública em products, reviews ou payment_events.
-- Para produção, implemente as políticas de administrador antes de usar o painel.
```

**Importante sobre o painel:** a tela usa Supabase Auth e uma lista de e-mails, mas isso sozinho não é uma barreira de segurança suficiente para gravação no banco. Configure políticas RLS de administrador com cuidado antes de habilitar operações de escrita. Não use a chave `service_role` no navegador.

## 3. Configurar o Supabase no front-end
Em `public/app.js` e `public/admin.js`, preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY` com a URL e chave pública (anon/publishable) do seu projeto. Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` nesses arquivos.

No `public/admin.js`, preencha `ADMIN_EMAILS` com os e-mails autorizados para abrir o painel. O bloqueio definitivo deve ser feito também por RLS no banco, não só no JavaScript.

## 4. Mercado Pago
Preencha `MERCADOPAGO_ACCESS_TOKEN` no `.env` do servidor. Nunca coloque o token em HTML ou JS do navegador. Configure o endereço público de `SITE_URL` e o webhook `/api/mercadopago/webhook` no painel Mercado Pago.

O endpoint consulta o pagamento na API antes de registrar o status recebido. **Este projeto inicial ainda não cria o pedido comercial completo nem reserva/baixa o estoque de forma transacional**, portanto não anuncie pedidos como confirmados apenas com o retorno para a página. Para produção, implemente:
- tabela `orders` e `order_items`;
- associação do pagamento a um pedido via `external_reference`;
- verificação de assinatura do webhook conforme a documentação atual do Mercado Pago;
- processamento idempotente e transação/reserva de estoque;
- confirmação do pedido apenas após pagamento aprovado confirmado no servidor;
- fluxo de cancelamento, reembolso e conciliação.

## 5. WhatsApp
Preencha `WHATSAPP_NUMBER` em `public/app.js` e `WA_NUMBER` em `public/product.js` com DDI + DDD + número, apenas dígitos. Exemplo de formato: `5584999999999`. Substitua pelo número real da loja.

## 6. Fotos e cadastro
O site não inventa produtos. Cadastre produtos reais no painel/banco e marque `active = true`. As imagens são URLs públicas HTTPS. Para fotos privadas, use Supabase Storage com bucket e políticas apropriadas. O formulário de cadastro aceita URLs de fotos, uma por linha.

## 7. Antes de vender de verdade
Este ZIP é uma base funcional de interface e integração, não uma solução comercial auditada pronta para produção. Antes de receber dinheiro real, complete e revise:
- políticas RLS administrativas;
- fluxo de pedidos e associação pagamento-pedido;
- assinatura e validação de webhooks;
- frete real, prazo e regras de entrega;
- LGPD, privacidade, termos, troca/devolução e atendimento;
- e-mail de confirmação e recuperação de senha;
- controle de estoque concorrente e prevenção de pedidos duplicados;
- testes em celular, segurança e hospedagem HTTPS.

Não há recurso de embalagem para presente neste projeto.
