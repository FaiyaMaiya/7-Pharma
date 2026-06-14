const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const certsDir = path.join(__dirname, '..', 'certs');
const keyPath = path.join(certsDir, 'localhost.key');
const certPath = path.join(certsDir, 'localhost.crt');

if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function main() {
  if (exists(keyPath) && exists(certPath)) {
    console.log('Existing certificate files found:');
    console.log('  Key:   ' + keyPath);
    console.log('  Cert:  ' + certPath);
    console.log('\nRemove them to regenerate.');
    process.exit(0);
  }

  const openssl = 'C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe';
  if (!exists(openssl)) {
    console.error('OpenSSL not found at expected path: ' + openssl);
    process.exit(1);
  }

  console.log('Generating self-signed development certificate...');
  try {
    execFileSync(openssl, [
      'req', '-x509', '-newkey', 'rsa:4096',
      '-keyout', keyPath,
      '-out', certPath,
      '-days', '365',
      '-nodes',
      '-subj', '/CN=localhost/O=7PharmaceuticalsDev'
    ], { stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to generate certificate.');
    process.exit(1);
  }

  console.log('Created:');
  console.log('  Key:   ' + keyPath);
  console.log('  Cert:  ' + certPath);
  console.log('\nEnable HTTPS by adding to your .env:');
  console.log('  HTTPS_KEY_PATH=' + keyPath);
  console.log('  HTTPS_CERT_PATH=' + certPath);
}

main();
