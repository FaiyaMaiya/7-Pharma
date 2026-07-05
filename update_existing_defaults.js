const fs=require('fs');
const path=require('path');

const productsPath=path.join(__dirname,'ProductsDB','products.json');
const imagesDir=path.join(__dirname,'images','Pharmaceutical Item List (001 - 129)');

const p=JSON.parse(fs.readFileSync(productsPath,'utf8'));

// Find any placeholder entries for ph216 specifically, then update defaults.
const targetId='ph216';
const idx=p.findIndex(x=>x.id===targetId);
if(idx<0){
  console.log('No',targetId,'entry found');
  process.exit(0);
}

const DEFAULT_PRICE=12.99;
const DEFAULT_INVENTORY=100;
const DEFAULT_CATEGORY='Pharmaceuticals Drugs & Surgical Consumables';

const files=fs.readdirSync(imagesDir);
const file=files.find(f=>/^Item\s*216\s*-\s*/i.test(f));
if(!file){
  console.warn('Missing image file for Item 216');
  process.exit(0);
}

const name=file.replace(/^Item\s*216\s*-\s*/i,'');
const image=`images/Pharmaceutical Item List (001 - 129)/${file}`;

p[idx]={
  id:targetId,
  name,
  price:p[idx].price===0?DEFAULT_PRICE:p[idx].price,
  category:p[idx].category==='Unknown'?DEFAULT_CATEGORY:p[idx].category,
  inventory:p[idx].inventory===0?DEFAULT_INVENTORY:p[idx].inventory,
  image
};

fs.writeFileSync(productsPath, JSON.stringify(p,null,2));
console.log('Updated',targetId,'to price/inventory defaults if needed');

