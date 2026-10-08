# Google Analytics (GA4) Integration

**Measurement ID:** `G-0QCSY96E2F`
**Scope:** Frontend only (`frontend/`). Nothing in `backend/`.

## What has been done

### 1. gtag.js loaded globally
File: `frontend/index.html` (lines 33–41)

- The Google tag (`gtag.js`) is loaded from `googletagmanager.com` in `<head>`.
- `gtag('config', 'G-0QCSY96E2F')` initialises GA4.
- Because it lives in `index.html`, it runs on **every page** of the site, admin pages included.

### 2. Analytics helper
File: `frontend/src/utils/analytics.js`

A thin wrapper around `window.gtag`. Every call is a no-op if gtag is missing (ad blockers, etc.), so callers never need to guard.

| Export | Purpose |
|---|---|
| `GA_MEASUREMENT_ID` | Holds the ID `G-0QCSY96E2F` |
| `trackPageview(path, title)` | Sends a `page_view` event with `page_path`, `page_title`, `page_location` |
| `trackViewItem(product)` | Sends the GA4 ecommerce `view_item` event (currency `INR`, value, item id/name/category/price/qty) |

### 3. Page views on every route (SPA tracking)
File: `frontend/src/components/PageTitle.jsx`, mounted once in `frontend/src/App.jsx` inside `<BrowserRouter>`.

The SPA never reloads `index.html`, so GA's automatic page view only fires once. `PageTitle` calls `trackPageview(pathname, title)` on **every route change**, so all pages are tracked, using the same title as the browser tab.

Pages covered (title shown as sent to GA):

**Public**
| Route | Title |
|---|---|
| `/` | Cloud Graphics Amravati — Custom Printed T-Shirts, Mugs & Corporate Gifts |
| `/products` | Shop Customisable Products — Cloud Graphics Amravati |
| `/products/:id` | Product Details — Cloud Graphics Amravati |
| `/services` | Graphic Design Services — Logo, Branding & Print Design \| … |
| `/about` | About Us — Custom Printing Studio in Amravati \| Cloud Graphics |
| `/contact` | Contact Us — Get a Printing Quote in Amravati \| Cloud Graphics |

**Customer account / shopping**
`/cart`, `/checkout`, `/orders`, `/favorites`, `/profile`, `/replacements`, `/login`, `/register`, `/forgot-password`

**Policies**
`/terms`, `/shipping-policy`, `/return-policy`

**Admin**
`/admin/dashboard`, `/admin/products`, `/admin/orders`, `/admin/payments`, `/admin/users`, `/admin/admins`, `/admin/events`, `/admin/categories`, `/admin/inquiries`, `/admin/reviews`, `/admin/replacements`, `/admin/export`

**Unknown URLs** are tracked as "Page Not Found — Cloud Graphics Amravati".

### 4. Product view tracking
File: `frontend/src/pages/ProductDetail.jsx` (line 32)

When a product finishes loading, `trackViewItem(product)` fires the `view_item` event. In GA4 this shows which products get the most views (Monetization → Ecommerce purchases / Items report).

## Events currently sent

| Event | Where | Trigger |
|---|---|---|
| `page_view` (automatic) | `index.html` config | First load |
| `page_view` (custom) | `PageTitle.jsx` | Every route change |
| `view_item` | `ProductDetail.jsx` | Product loaded on detail page |

## Not implemented yet

- `add_to_cart`, `begin_checkout`, `purchase`, `add_to_wishlist`, `search`, `login` / `sign_up` events
- Contact form / enquiry submission tracking (`generate_lead`)
- Admin pages are tracked together with public traffic (no filter or separate property)
- No cookie-consent banner

## Things to check

- **Possible duplicate first page view:** `gtag('config', …)` in `index.html` sends an automatic page view, and `PageTitle` also sends one on the initial mount. Setting `send_page_view: false` in the config would fix it, since `PageTitle` already covers the first load.
- **Admin traffic** will inflate stats. Consider a GA4 internal-traffic filter or skipping `trackPageview` for `/admin/*`.
- The Measurement ID is duplicated in `index.html` and `analytics.js`. Keep them in sync if it ever changes.
