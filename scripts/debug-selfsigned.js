const selfsigned = require('selfsigned');
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365 });
console.log('KEYS', Object.keys(pems));
console.log('PRIVATE', typeof pems.private, typeof pems.privateKey, typeof pems.key);
console.log('CERT', typeof pems.cert, typeof pems.certificate);
