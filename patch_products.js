const fs=require('fs');
const path=require('path');

const productsPath=path.join(__dirname,'ProductsDB','products.json');
const imagesDir=path.join(__dirname,'images','Pharmaceutical Item List (001 - 129)');

const p=JSON.parse(fs.readFileSync(productsPath,'utf8'));
const prodIds=new Set(p.map(x=>parseInt(String(x.id).slice(2),10)));

const missing=[];
for(let i=1;i<=305;i++) if(!prodIds.has(i)) missing.push(i);

if(!missing.length){
  console.log('No missing ids');
  process.exit(0);
}

const files=fs.readdirSync(imagesDir);

function imagePathForFile(file){
  return `images/Pharmaceutical Item List (001 - 129)/${file}`;
}

function filenameForItem(n){
  const re=new RegExp(`Item\\s*${n}\\s*-\\s*`, 'i');
  return files.find(f=>re.test(f)) || null;
}

function inferNameFromFilename(file){
  // Remove leading "Item XXX - " prefix
  return file.replace(/^Item\s*\d+\s*-\s*/i,'');
}

// Heuristic: price/inventory were consistently ~12.99/100 in the original file.
// We'll keep the same defaults so cart math works.
const DEFAULT_PRICE=12.99;
const DEFAULT_INVENTORY=100;
const DEFAULT_CATEGORY='Pharmaceuticals Drugs & Surgical Consumables';

for(const n of missing){
  const file=filenameForItem(n);
  if(!file) {
    console.warn('Missing image file for item',n,'; skipping');
    continue;
  }

  const id=`ph${n}`.padEnd(0); // placeholder, overwritten below
  const fixedId=`ph${n.toString().padStart(3,'0')}`;

  const name=inferNameFromFilename(file);
  const image=imagePathForFile(file);

  // If an entry already exists (shouldn't happen in normal runs), update its defaults too.
  const existingIndex=p.findIndex(x=>x.id===fixedId);
  const entry={
    id: fixedId,
    name,
    price: DEFAULT_PRICE,
    category: DEFAULT_CATEGORY,
    inventory: DEFAULT_INVENTORY,
    image
  };
  if(existingIndex>=0) p[existingIndex]=entry;
  else p.push(entry);
  console.log('Added',fixedId);
}

p.sort((a,b)=>parseInt(a.id.slice(2),10)-parseInt(b.id.slice(2),10));

fs.writeFileSync(productsPath, JSON.stringify(p,null,2));
console.log('Written',p.length,'products');

