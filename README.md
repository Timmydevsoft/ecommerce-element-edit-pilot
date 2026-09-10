# Northwind Market — ecommerce template (build plan)

A full-stack ecommerce template for IonBuilder. Cash on delivery, no payment
gateway. Customer storefront, staff fulfilment, admin management.

This file is both the README and the build tracker. Every phase below is
checkable; tick items as they land and re-read the decisions section before
making anything up. Nothing here is provisional — these were settled before any
code existed, deliberately, because the platform's edit model punishes
architecture decided late.

---

## 1. Settled decisions

Do not revisit these mid-build without changing this section first.

**Stack — identical to `hotel-booking-two`.** npm workspaces monorepo:
`server/` Express 5 + Drizzle + PostgreSQL on :4000, `client/` Vite 7 + React 19
+ React Router 7 + Tailwind v4 on :5173, client proxies `/api` to the server.
Component library is the same shadcn/ui set built on `radix-ui`, with
`class-variance-authority`, `tailwind-merge`, `clsx`, `lucide-react`, `sonner`
and `tw-animate-css`. Reuse the 23 `ui/` primitives verbatim.

**Payment: cash on delivery only.** No gateway, no secrets, no webhooks. An
order records `payment_method: 'COD'` and nothing is charged online.

**Cart: server-side, end to end.** `carts` + `cart_items` tables and a real API.
Not localStorage. Beyond persistence this *helps* modularity: a client-side cart
store would be imported by the header badge, the cart page and checkout — three
pages reaching into one file, which is the sharing problem this template exists
to avoid.

- Guest carts are supported via a signed cart cookie, and **merge into the
  account on sign-in**.
- **No stock hold at add-to-cart.** Stock is validated at checkout; a shortfall
  is a 409, the same shape the hotel template uses for a double-booked room.
  Holding inventory needs expiry jobs and reconciliation — that is v2.

**RBAC: three roles, genuinely split.**

| | customer | staff | admin |
|---|---|---|---|
| Shop, order, view own orders | ✓ | ✓ | ✓ |
| Fulfil orders, update status | | ✓ | ✓ |
| Restock (adjust variant stock) | | ✓ | ✓ |
| Create/delete products, change prices | | | ✓ |
| Manage users and roles | | | ✓ |

Enforced by `requireRole(...roles)` in route middleware. Client-side guards are
navigation aids only, never the boundary.

**Order history is immutable.** `order_items` snapshots product title and unit
price at purchase, so a later price or title edit cannot rewrite what a customer
was charged. Same reasoning as the hotel template freezing `total_amount`.

**`orders.user_id` is nullable, `on delete set null`.** A guest order survives
account deletion; an account order survives the account.

---

## 2. The rule the layout serves

The platform shows the editing model **one page at a time**, and two pieces of
platform code decide what it may rewrite — both reading the same three fields of
a page manifest:

```
edit boundary = sourceEntry + layout + componentDependencies
```

> **A file that renders on more than one page must never appear in any page's
> boundary.**

Break it and the failure is invisible: an edit aimed at one page rewrites a
component another page renders, `tsc` passes because the JSX is valid, and the
damage appears later somewhere nobody was looking.

Four resolutions, chosen per component:

1. **Own page entry** — a shared component that looks the same everywhere.
2. **Own page entry + CONFIG surface** — chrome. The page entry carries styling;
   the JSON carries copy, edited deterministically with no model.
3. **Protect it** — primitives with no project-specific content.
4. **Protected base + per-page wrappers** — a shared component that must *look
   different* per page. New in this template; see `ProductCard` below.

---

## 3. Shared components and their resolution

| Component | Renders on | Resolution |
|---|---|---|
| **ProductCard** | home, catalogue, related strip | **protected base + per-page wrappers** |
| Order summary block | confirmation, lookup, account, dashboard order | own page entry `order-summary` |
| Cart totals | cart, checkout | own page entry `cart-summary` |
| Address form | checkout, account | own page entry `address-form` |
| Header, footer | every storefront page | `site-chrome` + `site.chrome` CONFIG |
| Dashboard sidebar | every dashboard page | `dashboard-chrome` + `dashboard.chrome` CONFIG |
| PriceDisplay, StockBadge, QuantityStepper | everywhere | protect — formatting only |
| VariantSelector | product detail only | page-exclusive, no special handling |
| CategoryFilter | catalogue only | page-exclusive |

### The ProductCard pattern

A product card appears on three pages and each wants it to look **different** —
large on the homepage, dense in the catalogue grid, minimal in the related strip.
Neither an own-page-entry (one global edit is not what "make the homepage cards
bigger" means) nor protection (kills a very common request) is right.

So: split presentation from the data contract.

```
components/product/product-card-base.tsx   PROTECTED — image, title, price, stock, link
features/home/FeaturedProductCard.tsx      homepage-exclusive   — layout only
features/catalogue/CatalogueProductCard.tsx catalogue-exclusive — layout only
features/product/RelatedProductCard.tsx    product-detail-exclusive — layout only
```

Each wrapper sits in exactly one boundary, so a homepage card edit touches one
homepage file. The price and stock binding stays protected. This is **not**
copy-paste duplication: logic is shared, only layout is per-page, which is
precisely what legitimately differs.

---

## 4. Page list

Storefront:

| id | route | access |
|---|---|---|
| `homepage` | `/` | public |
| `catalogue` | `/products` (search via `?q=`) | public |
| `product-detail` | `/products/:slug` | public |
| `cart` | `/cart` | public |
| `checkout` | `/checkout` | public |
| `order-confirmation` | `/orders/confirmation/:reference` | public |
| `order-lookup` | `/orders/lookup` | public |
| `login` | `/login` | public |
| `register` | `/register` | public |
| `account` | `/account` | guest (signed in) |

Dashboard:

| id | route | access |
|---|---|---|
| `dashboard` | `/dashboard` | staff |
| `dashboard-orders` | `/dashboard/orders` | staff |
| `dashboard-inventory` | `/dashboard/inventory` | staff |
| `dashboard-products` | `/dashboard/products` | **admin** |
| `dashboard-users` | `/dashboard/users` | **admin** |
| `dashboard-settings` | `/dashboard/settings` | admin |

Shared-component entries: `site-chrome`, `dashboard-chrome`, `order-summary`,
`cart-summary`, `address-form`.

**21 page entries.** Not-editable routes (`/forbidden`, 404) are deliberately
absent from the registry, as in the hotel template.

---

## 5. Schema

```
users        id, email, password_hash, full_name, phone, role(customer|staff|admin)
categories   id, slug, name, description, position
products     id, slug, title, description, images[], category_id, is_published
variants     id, product_id, sku, name, price, stock, is_active
carts        id, user_id?, session_token, expires_at
cart_items   id, cart_id, variant_id, quantity
orders       id, reference, user_id?, customer_name/email/phone, address fields,
             status, subtotal, delivery_fee, total, payment_method='COD', notes
order_items  id, order_id, variant_id, product_title, variant_name,
             unit_price, quantity            <- snapshots, never joined for display
```

Order status: `PENDING · CONFIRMED · PACKED · DISPATCHED · DELIVERED · CANCELLED`.

---

## 6. Build phases

### Phase 1 — Workspace skeleton
- [x] Root `package.json` (workspaces, concurrently, db scripts), `.gitignore`, `.env.example`, `.prettierrc`
- [x] `drizzle.config.ts` pointing at the server schema barrel
- [x] `server/package.json`, `server/tsconfig.json`
- [x] `client/package.json`, `client/tsconfig.json`, `client/index.html`
- [x] `client/vite.config.ts` — **carry over every setting** from hotel-booking-two: dev gzip, pinned `optimizeDeps.include`, `host: true`, `allowedHosts: true`, `css.postcss` pin, `/api` proxy to :4000

### Phase 2 — Server foundation
- [x] `common/env.ts` — process env first, `.env` only as fallback
- [x] `common/db/index.ts` — **node-postgres**, TLS decided by host (never the Neon HTTP driver)
- [x] `common/db/columns.ts`, `schema.ts` barrel, `relations.ts`
- [x] `common/errors.ts`, `common/validate.ts`, `common/money.ts`
- [x] `common/middleware/auth.ts` — `attachSession`, `requireAuth`, **`requireRole(...roles)`**
- [x] `index.ts` — app assembly, `/api/health` with no I/O

### Phase 3 — Auth module
- [x] `auth.model.ts` (users + role enum), credentials, token, session
- [x] service, controller, routes — register/login/logout/me
- [x] role change invalidates live sessions (re-read user, compare role)
- [x] unit tests for credentials + tokens

### Phase 4 — Catalogue
- [x] `categories` and `products` models, `variants` model
- [x] service: list, filter by category, search `q`, get by slug, related
- [x] admin: product create/update/delete (admin), variant restock (staff)
- [x] controllers + routes with the correct `requireRole`

### Phase 5 — Cart
- [x] `carts` / `cart_items` models
- [x] signed cart cookie for guests; resolve cart per request
- [x] add / update quantity / remove / clear / get
- [x] **merge guest cart into user cart on login and register**

### Phase 6 — Orders
- [x] `orders` / `order_items` models with snapshot columns
- [x] checkout: validate stock, decrement, snapshot lines, create order, clear cart
- [x] reference generator; lookup by reference + email
- [x] customer order history; staff queue; status transitions
- [x] dashboard metrics: orders today, revenue, low stock, pending fulfilment

### Phase 7 — Client foundation
- [x] Copy the 23 `ui/` primitives and `lib/utils.ts` from hotel-booking-two
- [x] `index.css` — Tailwind v4 tokens, light + dark, own palette
- [x] `config/brand.generated.json`, `config/site-content.json`, `config/app-config.ts`
- [x] `api/client.ts` and one typed client per domain
- [x] `features/auth/auth.context.tsx`, `components/protected-route.tsx` with role support
- [x] `hooks/use-async.ts`, `hooks/use-cart.ts`
- [x] layouts, chrome (header with cart badge, footer, dashboard sidebar)
- [x] `router.tsx`

### Phase 8 — Storefront pages
- [x] home, catalogue, product detail
- [x] cart, checkout, confirmation, lookup
- [x] login, register, account
- [x] shared entries: order summary, cart summary, address form
- [x] `product-card-base` + the three per-page wrappers

### Phase 9 — Dashboard pages
- [x] dashboard overview, orders, inventory (restock)
- [x] products (admin), users (admin), settings

### Phase 10 — Manifests
- [x] `template.manifest.json` — runtime, database, branding, env, protectedPaths, surfaces
- [x] 21 page manifests + `page.description.md` + `fixtures.json` each
- [x] `data-builder-id` anchor for every COMPONENT surface

### Phase 11 — Data and docs
- [x] idempotent seed: categories, products, variants, one admin, one staff, one customer
- [x] drizzle migration generated and committed
- [x] README rewritten as documentation (this plan moves to `plans/`)

### Phase 12 — Verification
- [x] `check_template.py` passes — zero files shared across boundaries
- [x] `npm run typecheck` clean, both workspaces
- [x] `npm run build` clean
- [x] `npm test` passes
- [x] platform validator reports `CONFORMS`
- [ ] registered and built on the platform, reaching `BUILT` — **blocked: Docker daemon is down**
- [ ] a page edit lands in exactly one file — **blocked: needs the platform running**

---

## 7. Non-negotiable runtime settings

Each of these was a real production failure in the hotel template. Carry them
over rather than rediscovering them.

- `server.host: true`, `allowedHosts: true` — the preview proxy serves a
  hostname the dev server has never seen.
- Gzip the dev server — an unbundled dev server behind a remote proxy otherwise
  exceeds the verification browser's navigation budget on first load.
- Pin `optimizeDeps.include` — lazy discovery restarts Vite's optimiser
  mid-load and the page never finishes loading.
- `css: { postcss: {} }` — stops Vite adopting a stray PostCSS config from a
  parent directory.
- `node-postgres`, never the Neon HTTP driver — the same driver must serve a
  managed Neon database and the loopback PostgreSQL a sandbox runs.
- Read config from `process.env` first; the platform injects `DATABASE_URL` and
  `AUTH_SECRET` into the process, not into a file.
- `/api/health` performs no I/O, so it answers even when Postgres is down.

---

## 8. Known limits

- **The server is frozen to page edits.** No page manifest declares a `server/`
  file, so schema and endpoint changes are permanently outside the AI edit path.
  The API must be complete at build time.
- **Catalogue tags are unvalidated.** `ecommerce`, `marketplace` and `retail`
  overlap in the platform's category vocabulary; tag deliberately, claiming only
  what this template has.
- **The page picker has no grouping**, so 21 entries appear as one flat list of
  cards mixing pages and shared components.

---

## 9. Deviations from this plan, and why

Recorded rather than quietly absorbed.

**`address-form` is not a shared entry; there are 20 page entries, not 21.**
The plan assumed a saved-address feature shared between checkout and the
account page. The schema has no `addresses` table — an order carries its own
delivery fields — so `DeliveryFields` renders only at checkout and is
checkout-exclusive. A shared entry for a component with one caller would have
been ceremony.

**The manifest generator lives outside the template.**
`templates/_tools/generate-ecommerce-manifests.py` writes the twenty page
manifests and `template.manifest.json`. It sits outside the template directory
because everything inside it is copied into a customer's workspace, and a build
script for the template itself has no business being there.

**Three surfaces have no `selector`.**
`homepage.featured-card`, `catalogue.card` and `product.related-card` each
return `ProductCardBase` directly and render no element of their own, so there
is nothing to anchor. They are surfaces without a DOM selector, which is
honest; the other twenty-nine COMPONENT surfaces all carry a verified
`data-builder-id`.

**Auth and cart contexts live in `hooks/`, not `features/`.**
`features/` is page-exclusive by rule, and both contexts are read by several
pages. Putting them in the protected `hooks/` directory keeps the rule intact —
shared logic protected, per-page presentation editable.

**The landing page was rebuilt, and its copy is section-owned.**
The first version was the default shadcn arrangement — centred gradient hero,
badge above the headline, one accent-coloured word, a row of three
icon-in-a-rounded-square cards. Competent, and identical to every other
generated Tailwind site.

It is now asymmetric: copy on the left at an editorial type scale, a staggered
collage of real product photography on the right, reassurance as a quiet
three-column strip under a hairline rule rather than as icon cards, and
departments as bordered typographic tiles. Section headings share one rhythm —
left aligned, hairline rule, action on the right.

Its wording lives in three files under `client/src/content`, exposed as SECTION
surfaces for the hero, departments and featured products. Their fields are
bounded, link targets are non-generative, and each carries three template-owned
layout variants. Copy regeneration therefore writes validated JSON rather than
JSX, while a layout change only replaces the section's `variant` value. The
shared `site-content.json` is reserved for header, footer and dashboard chrome.

**The free-delivery threshold is single-sourced.** The old copy read "Free
delivery over £50" as a literal while `appConfig.freeDeliveryOver` held the real
number. Changing the config would have left the page telling customers something
untrue. The copy now carries an `{amount}` token that the page fills from
config.

**Demo imagery is real photography, and every frame was checked.**
The first pass used Unsplash photo IDs chosen by guesswork. Rendering all twelve
as a contact sheet showed only two were right: a watermelon for wildflower
honey, a blender for a cast-iron skillet, bleach and hand sanitiser for linen
tea towels. Those URLs ship to every project built from this template, so being
subtly wrong is worse than being obviously a placeholder.

The current set was gathered by searching Unsplash in a real browser — its
search is client-rendered, so curl returns an empty shell — and then verified
the same way, by rendering the set and looking at it. **If you change one,
verify it the same way. A plausible-looking id is not evidence.**

**The hero holds its shape with an empty catalogue.**
`HeroCollage` used to collapse to one blank rectangle when there were no
products, which reads as broken rather than as new. It now renders the same
staggered arrangement with empty tiles. Both it and `ProductCardBase` carry an
`onError` fallback: an image that cannot be fetched swaps to
`client/public/product-placeholder.svg`, which ships with the template and
needs no network. That matters because a sandbox may restrict egress to a
package-manager allow list, where a photo CDN is unreachable — the shop then
renders composed rather than empty. The swap is guarded so a placeholder that
also failed cannot retry forever.

**`formatMoneyCompact` exists for prose.** "Orders over £50 arrive free" reads;
"over £50.00" does not. Non-whole amounts keep their pence, because rounding
them would be a lie. Price tags still use `formatMoney`.
