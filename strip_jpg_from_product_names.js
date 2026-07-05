const fs = require('fs');
const path = require('path');

const productsPath = path.join(__dirname, 'ProductsDB', 'products.json');

const raw = fs.readFileSync(productsPath, 'utf8');
const products = JSON.parse(raw);

let changed = 0;

for (const p of products) {
  if (typeof p.name !== 'string') continue;
  // Remove trailing ".jpg" / ".JPG" (exactly at end of string)
  const before = p.name;
  const after = before.replace(/\.jpg$/i, '');
  if (after !== before) {
    p.name = after;
    changed++;
  }
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
console.log(`Done. Updated ${changed} product name(s). Total products: ${products.length}`);

