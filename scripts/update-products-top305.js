const fs = require('fs');
const path = require('path');

const productsJsonPath = path.join(__dirname, '..', 'ProductsDB', 'products.json');
const imagesDir = path.join(__dirname, '..', 'images', 'Pharmaceutical Item List (001 - 129)');

const TARGET_COUNT = 305;
const BASE_PREFIX = 'ph';

function parseItemNumberFromFilename(filename) {
  // matches: "Item 001 - ...jpg" or "Item 200 - ...jpeg"
  const m = filename.match(/^Item\s+(\d+)\s+-\s+/i);
  if (!m) return null;
  return Number(m[1]);
}

function itemImagePath(filename) {
  // Must match existing pattern used in products.json
  return `images/Pharmaceutical Item List (001 - 129)/${filename}`;
}

function titleFromFilename(filename) {
  // remove leading "Item NNN - "
  return filename.replace(/^Item\s+\d+\s+-\s+/i, '');
}

function buildNewProducts(existingProducts, imageFiles) {
  // Existing products are ph001..ph176.
  const existingByItemIndex = new Map();
  for (const p of existingProducts) {
    const idx = Number(String(p.id).replace(/^ph/i, ''));
    if (Number.isFinite(idx)) existingByItemIndex.set(idx, p);
  }

  // Parse all image files that match Item NNN - ...
  const items = [];
  for (const f of imageFiles) {
    const idx = parseItemNumberFromFilename(f);
    if (!idx) continue;
    items.push({ idx, filename: f });
  }

  items.sort((a, b) => a.idx - b.idx);

  // We only need the first TARGET_COUNT items by idx.
  const maxIdxNeeded = TARGET_COUNT;

  const out = [];
  for (let i = 1; i <= TARGET_COUNT; i++) {
    const existing = existingByItemIndex.get(i);
    const item = items.find(it => it.idx === i);

    if (existing && item) {
      // Keep existing price/category/inventory but ensure image/path+name match.
      out.push({
        id: existing.id,
        name: item ? titleFromFilename(item.filename) : existing.name,
        price: existing.price,
        category: existing.category,
        inventory: existing.inventory,
        image: item ? itemImagePath(item.filename) : existing.image
      });
      continue;
    }

    if (item) {
      // Default cloned values for new products (your selection: A)
      out.push({
        id: `${BASE_PREFIX}${String(i).padStart(3, '0')}`,
        name: titleFromFilename(item.filename),
        price: 12.99,
        category: 'Pharmaceuticals Drugs & Surgical Consumables',
        inventory: 100,
        image: itemImagePath(item.filename)
      });
      continue;
    }

    // If we don't have an image for this idx, still create a placeholder so IDs remain contiguous.
    out.push({
      id: `${BASE_PREFIX}${String(i).padStart(3, '0')}`,
      name: `Product ${i}`,
      price: 12.99,
      category: 'Pharmaceuticals Drugs & Surgical Consumables',
      inventory: 0,
      image: ''
    });
  }

  return out;
}

function main() {
  if (!fs.existsSync(productsJsonPath)) {
    console.error('products.json not found:', productsJsonPath);
    process.exit(1);
  }

  if (!fs.existsSync(imagesDir)) {
    console.error('images directory not found:', imagesDir);
    process.exit(1);
  }

  const existingProducts = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));
  const imageFiles = fs.readdirSync(imagesDir);

  const newProducts = buildNewProducts(existingProducts, imageFiles);

  fs.writeFileSync(productsJsonPath, JSON.stringify(newProducts, null, 2));
  console.log(`Updated products.json to ${newProducts.length} products`);
}

main();

