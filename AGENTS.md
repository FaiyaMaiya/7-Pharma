# 7 Pharmaceuticals Ltd - AI Agent Instructions

## Project Overview
A pharmaceutical e-commerce web application built with vanilla JavaScript, HTML, and CSS. Customers can browse products, search/filter by category and price, and manage a shopping cart with invoice generation.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript, Fuse.js (fuzzy search), jsPDF (invoice generation)

---

## Architecture & Key Files

### Structure
- **Index.html** — Main product listing page with header, search/filter controls, products grid, and cart panel
- **login.html** — Login/authentication page (not yet integrated)
- **Search.html** — Dedicated search results page
- **CSS/style.css** — All styling (desktop responsive, mobile hamburger menu)
- **JS/javascript.js** — All application logic (product loading, cart, search, invoicing)
- **ProductsDB/products.json** — Product database with id, name, price, category, inventory, image

### Mobile Responsiveness
- Header uses `.desktop-only` and `.mobile-only` classes
- Hamburger menu controlled by `openMobileMenu()` / `closeMobileMenu()`
- Mobile menu syncs search/filters with desktop (e.g., `mainSearch` ↔ `mobileSearch`)
- Modals use `aria-hidden` and `display: flex` for visibility

---

## Current Features

### Cart System
- **Cart object:** `cart = { productId: quantity, ... }` (stored in memory only)
- **Functions:**
  - `addToCart(productId)` — Add/increment item, decrement inventory, show alert
  - `renderCartPanel()` — Display cart items with subtotals and total
  - `updateCartCount()` — Update badge in header (desktop & mobile)
  - `getCartTotalItems()` — Sum all quantities
  - `getCartTotalAmount()` — Sum all price × quantity
  - `checkout()` — Clears cart, shows alert (no backend integration)
  - `generateInvoice()` — PDF download via jsPDF

- **Cart Panel:** (ID: `cart-panel`)
  - Displays in a modal overlay
  - Opens with `openCart()`, closes with `closeCartPanel()`
  - Shows empty message if no items
  - Renders items in `cart-items-list` div

### Product Management
- **Loading:** `loadProducts()` fetches from `ProductsDB/products.json`
- **Rendering:** `renderAllProducts()` — Full inventory display
- **Search:** `performSearch()` — Filter by query, category, price range, sort
- **Stock tracking:** Decrement `product.inventory` on add-to-cart; disable button if ≤0

### Search & Filtering
- **Fuse.js integration** for fuzzy search (CDN link in header)
- **Sort options:** relevance, price-asc/desc, name-asc/desc
- **Category dropdown** with 6 pharmaceutical categories
- **Price range filters** (Min/Max PGK input)

### Invoice Generation
- `generateInvoice()` creates PDF with jsPDF (CDN in Index.html)
- Format: invoice ID, date, itemized table, GST calculation (10%), total
- File named `INV-{timestamp}.pdf`

---

## Known Issues & Planned Features

### **HIGH PRIORITY: Cart Remove Functionality**
**Status:** ⚠️ Missing feature  
**Issue:** Cart items cannot be removed; only checkout or clear entire cart  
**Impact:** Users cannot fix mistakes (add wrong quantity/item)  
**Implementation needed:**
1. Add delete button (or trash icon) to each `cart-item` div in `renderCartPanel()`
2. Create `removeFromCart(productId)` function:
   - Decrement cart quantity (or remove if quantity = 1)
   - Increment product inventory back
   - Re-render cart
   - Update cart count
3. Update quantity without removing (optional enhancement)

**Code location:** Line ~120-150 in JS/javascript.js (renderCartPanel function)

**Pattern to follow:**
```javascript
function removeFromCart(productId) {
  // Decrement quantity or remove if 1
  // Restore product.inventory
  // Re-render and update UI
}
```

### **Other Known Gaps**
- Cart not persisted (localStorage not implemented) — users lose cart on refresh
- Login page not integrated
- Search.html page not linked or populated
- No backend API — all data/checkout is client-side
- No payment integration
- No user account system

---

## Code Conventions

### Naming
- **DOM elements:** kebab-case IDs (e.g., `cart-panel`, `cart-items-list`)
- **Functions:** camelCase (e.g., `openCart()`, `renderCartPanel()`)
- **CSS classes:** kebab-case (e.g., `.product-image-wrap`, `.low-stock`)

### HTML Patterns
- Accessibility: Use `aria-label`, `aria-hidden`, `role` attributes
- Data attributes for JS hooks (e.g., `data-image`, `data-title` on product divs)
- Semantic HTML where possible (`<header>`, `<nav>`, modal with `role="dialog"`)

### JavaScript Patterns
- Global variables for cart state: `let allProducts = []`, `const cart = {}`
- Direct DOM queries (no framework, no module system)
- Inline event handlers in HTML (`onclick=`) — consider refactoring to addEventListener
- Modals use `display: flex` / `display: none` for show/hide
- Alert() for user feedback (basic UX)

### Styling
- Mobile-first approach with `.desktop-only` / `.mobile-only` classes
- Pharmacy branding colors: blues (#0a4d92), whites, grays
- Responsive grid for products (likely CSS Grid or Flexbox)

---

## Development Workflow

### Adding New Features
1. **Update HTML** (Index.html) if UI elements needed
2. **Add JS logic** (JS/javascript.js) — functions, event handlers
3. **Style it** (CSS/style.css) — keep mobile responsive
4. **Test** — Check desktop & mobile; test cart/search/filter flows

### Testing Checklist
- ✓ Responsive on mobile (test with hamburger menu, touch)
- ✓ Cart operations (add, view, total, checkout)
- ✓ Search/filter (all 4 filter types + sort)
- ✓ Stock updates (add item → inventory decrement)
- ✓ Invoice generation (PDF downloads correctly)
- ✓ Accessibility (keyboard nav, ARIA labels)

---

## Immediate Actions for AI Agents

### **Priority 1: Implement Cart Item Removal**
When user asks to add "remove item" option to cart:
1. Read the current `renderCartPanel()` at Line ~120
2. Add a delete/trash button to the cart-item div template
3. Create `removeFromCart(productId)` function
4. Update `renderCartPanel()` to re-render after removal
5. Test cart operations (add, remove, checkout flow)

### **Priority 2: Persist Cart (if requested)**
- Use `localStorage.setItem('cart', JSON.stringify(cart))` on changes
- Load with `localStorage.getItem('cart')` on page init

### **Priority 3: Link Search.html page**
- Populate Search.html with same layout as Index.html
- Link nav buttons to navigate

---

## Useful Commands
- **Live preview:** Open `Index.html` in browser (no build step needed)
- **Debug:** Browser DevTools (Console for JS errors, Network for JSON load, Elements for DOM)
- **PDF export test:** Click "Invoice" button in cart (verify jsPDF CDN loaded)

---

## External Dependencies
- **Fuse.js (v6.6.2):** Fuzzy search library (CDN: `cdn.jsdelivr.net/npm/fuse.js@6.6.2`)
- **jsPDF:** PDF generation (CDN: assumed in Index.html header)
- **Font Awesome (v6.5.0):** Icons (CDN: `cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0`)

**Note:** All CDN dependencies must be available in Index.html `<head>`.
