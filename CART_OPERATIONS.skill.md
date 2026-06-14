# Cart Operations Skill

## Purpose
This skill guides AI agents on implementing common shopping cart manipulations for the 7 Pharmaceuticals e-commerce site, including item removal, quantity updates, and localStorage persistence.

**When to use:** Agent is asked to add remove-item button, update cart quantity, or persist cart across browser sessions.

---

## Quick Reference

### Core Functions to Implement

| Function | Purpose | Location |
|----------|---------|----------|
| `removeFromCart(productId)` | Remove or decrement item from cart | JS/javascript.js |
| `updateCartItemQuantity(productId, newQuantity)` | Set item to specific quantity | JS/javascript.js |
| `saveCartToStorage()` | Persist cart to localStorage | JS/javascript.js |
| `loadCartFromStorage()` | Restore cart from localStorage on page load | JS/javascript.js |

---

## Implementation Patterns

### 1. Remove Item from Cart

**What it does:**
- Decrements quantity by 1 (or removes if quantity = 1)
- Restores product inventory
- Re-renders cart UI
- Updates cart badge count

**Code pattern:**
```javascript
function removeFromCart(productId) {
  // Validate product exists in cart
  if (!cart[productId]) return;
  
  // Get product for inventory restoration
  const product = allProducts.find(item => item.id === productId);
  if (!product) return;

  // Decrement or remove
  if (cart[productId] > 1) {
    cart[productId]--;
  } else {
    delete cart[productId];
  }
  
  // Restore inventory
  product.inventory++;
  
  // Update UI
  updateCartCount();
  renderCartPanel();
  performSearch(); // Refresh product buttons to show updated stock
  
  // Persist
  saveCartToStorage();
  
  // Feedback
  alert(`${product.name} removed from cart.`);
}
```

**UI integration:**
```html
<!-- In renderCartPanel(), add delete button to each cart item -->
<div class="cart-item">
  <img src="${product.image}" alt="${product.name}" class="cart-item-image" loading="lazy">
  <div class="cart-item-info">
    <div class="cart-item-title">${product.name}</div>
    <div class="cart-item-meta">${quantity} × PGK ${product.price.toFixed(2)}</div>
  </div>
  <div class="cart-item-subtotal">PGK ${subtotal.toFixed(2)}</div>
  <button class="cart-item-remove" 
          onclick="removeFromCart('${productId}')" 
          aria-label="Remove ${product.name} from cart">
    <i class="fas fa-trash"></i>
  </button>
</div>
```

---

### 2. Update Cart Item Quantity

**What it does:**
- Sets item quantity to a specific number
- Adjusts product inventory to match
- Prevents setting quantity ≤ 0 or exceeding available stock

**Code pattern:**
```javascript
function updateCartItemQuantity(productId, newQuantity) {
  // Validate input
  if (!cart[productId] || newQuantity < 1) return;
  
  const product = allProducts.find(item => item.id === productId);
  if (!product) return;

  // Calculate inventory adjustment
  const currentQuantity = cart[productId];
  const difference = newQuantity - currentQuantity;
  
  // Check if enough stock available
  if (difference > product.inventory) {
    alert(`Not enough stock. Available: ${product.inventory}`);
    return;
  }
  
  // Update cart and inventory
  cart[productId] = newQuantity;
  product.inventory -= difference;
  
  // Update UI
  updateCartCount();
  renderCartPanel();
  performSearch();
  
  // Persist
  saveCartToStorage();
}
```

**UI Integration:**
```html
<!-- Optional: Quantity input field in cart item -->
<div class="cart-item">
  <!-- ...existing content... -->
  <input type="number" 
         value="${quantity}" 
         min="1" 
         max="${product.inventory + quantity}"
         onchange="updateCartItemQuantity('${productId}', this.value)"
         aria-label="Quantity for ${product.name}">
</div>
```

---

### 3. Persist Cart to localStorage

**What it does:**
- Saves cart object to browser storage when changed
- Allows users to keep cart across sessions

**Code pattern:**
```javascript
function saveCartToStorage() {
  try {
    const cartData = JSON.stringify(cart);
    localStorage.setItem('7pharma_cart', cartData);
  } catch (error) {
    console.error('Failed to save cart to storage:', error);
  }
}

function loadCartFromStorage() {
  try {
    const cartData = localStorage.getItem('7pharma_cart');
    if (cartData) {
      const savedCart = JSON.parse(cartData);
      
      // Restore cart object
      Object.assign(cart, savedCart);
      
      // Restore product inventory (subtract cart quantities)
      Object.entries(cart).forEach(([productId, quantity]) => {
        const product = allProducts.find(item => item.id === productId);
        if (product) {
          product.inventory -= quantity;
        }
      });
      
      updateCartCount();
    }
  } catch (error) {
    console.error('Failed to load cart from storage:', error);
  }
}

// Call on page load (in loadProducts callback or init)
async function loadProducts() {
  try {
    const response = await fetch('ProductsDB/products.json');
    if (!response.ok) throw new Error('Failed to load products');
    allProducts = await response.json();
    loadCartFromStorage(); // ← Add this line
    renderAllProducts();
  } catch (error) {
    console.error('Error loading products:', error);
  }
}
```

**When to call saveCartToStorage():**
- After `addToCart()` completes
- After `removeFromCart()` completes
- After `updateCartItemQuantity()` completes
- After `checkout()` clears cart

**Important:** Do NOT call saveCartToStorage() in every render cycle (e.g., renderCartPanel). Only save when cart state actually changes.

---

### 4. Clear Cart (Enhanced)

**What it does:**
- Removes all items from cart
- Restores all product inventory
- Clears localStorage
- Closes cart panel

**Code pattern:**
```javascript
function clearCart() {
  // Restore all inventory
  Object.keys(cart).forEach(productId => {
    const product = allProducts.find(item => item.id === productId);
    if (product) {
      product.inventory += cart[productId];
    }
  });
  
  // Clear cart
  Object.keys(cart).forEach(key => delete cart[key]);
  
  // Clear storage
  localStorage.removeItem('7pharma_cart');
  
  // Update UI
  updateCartCount();
  renderCartPanel();
  performSearch();
}
```

---

## CSS Styling for Cart Operations

Add these styles to [CSS/style.css](CSS/style.css):

```css
/* Remove button styling */
.cart-item-remove {
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  font-size: 1rem;
  padding: 4px 8px;
  transition: color 0.2s;
}

.cart-item-remove:hover {
  color: #c0392b;
}

/* Quantity input in cart */
.cart-item input[type="number"] {
  width: 50px;
  padding: 4px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
}

.cart-item input[type="number"]:focus {
  outline: none;
  border-color: #0a4d92;
}
```

---

## Migration Checklist

When implementing these features:

- [ ] Add `removeFromCart(productId)` function
- [ ] Add remove button to cart item template in `renderCartPanel()`
- [ ] Add `saveCartToStorage()` function
- [ ] Add `loadCartFromStorage()` function
- [ ] Call `loadCartFromStorage()` after `loadProducts()`
- [ ] Call `saveCartToStorage()` after cart changes (addToCart, removeFromCart, checkout)
- [ ] Add CSS for remove button and quantity inputs
- [ ] Test: Add item → Refresh page → Verify cart persists
- [ ] Test: Remove item → Verify inventory restores
- [ ] Test: Checkout → Verify localStorage clears
- [ ] Test: Mobile responsiveness of cart buttons

---

## Testing Scenarios

### Remove Item
1. Add product to cart
2. Open cart panel
3. Click remove button
4. Verify: Item removed, inventory restored, cart count updated
5. Verify: performSearch() re-renders, product button shows new stock

### Persist Cart
1. Add multiple items to cart
2. Refresh browser (Ctrl+R or F5)
3. Verify: Cart items remain, quantities correct
4. Open DevTools → Application → localStorage
5. Verify: `7pharma_cart` key contains cart JSON

### Update Quantity
1. Add product with quantity 1
2. Change quantity input to 3
3. Verify: Cart updates, inventory decrements by 2
4. Try to set quantity > available stock
5. Verify: Alert shown, quantity not updated

---

## Edge Cases to Handle

| Case | Behavior |
|------|----------|
| Remove from empty cart | Silently return (no-op) |
| Remove product not in cart | Silently return |
| Update quantity to 0 or negative | Reject with validation |
| Restore inventory exceeds original | Cap at reasonable max or track original |
| localStorage quota exceeded | Log error, continue without persistence |
| Product removed from JSON after added to cart | Handle gracefully (inventory mismatch) |

---

## Related Functions

These functions interact with cart operations:

| Function | In | Used By |
|----------|----|---------| 
| `addToCart()` | javascript.js | Product add button |
| `renderCartPanel()` | javascript.js | Cart UI render |
| `updateCartCount()` | javascript.js | Cart badge update |
| `getCartTotalItems()` | javascript.js | Cart calculations |
| `getCartTotalAmount()` | javascript.js | Cart total |
| `checkout()` | javascript.js | Purchase completion |
| `performSearch()` | javascript.js | Product stock refresh |

---

## Performance Notes

- **localStorage limit:** ~5-10MB (should be fine for cart data)
- **Serialization cost:** Minimal for small carts (<100 items)
- **Inventory sync:** Must synchronize cart with product.inventory on load/add/remove
- **Render optimization:** Avoid re-rendering full product list on every cart change; target cart panel only

---

## Future Enhancements

- [ ] Quantity input with +/- buttons in cart panel
- [ ] Undo/redo cart history
- [ ] Wishlist functionality (separate from cart)
- [ ] Cart expiration timer (auto-clear after N days)
- [ ] Sync cart to backend (user account required)
- [ ] Cart abandonment email notification
