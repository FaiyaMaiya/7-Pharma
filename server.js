const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const session = require('express-session');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./db');
db.ensureFile();

const HTTPS_KEY_PATH = (process.env.HTTPS_KEY_PATH || '').trim();
const HTTPS_CERT_PATH = (process.env.HTTPS_CERT_PATH || '').trim();
const HTTPS_CA_PATH = (process.env.HTTPS_CA_PATH || '').trim();

const app = express();
const http = require('http');
const https = require('https');
const port = process.env.PORT || 3000;

// JSON body parser middleware
app.use(express.json());

// Trust the first proxy (e.g., nginx / load balancer) so req.secure
// correctly respects X-Forwarded-Proto when SSL is terminated upstream.
app.set('trust proxy', 1);

// CORS: only reflect allowed origins in production.
// Set CORS_ORIGIN to a comma-separated list of allowed origins.
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((s) => s.trim());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl) or from allowed origins
    if (!origin || corsOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Session-Id', 'X-Admin-Token']
}));

const createServer = () => {
  if (HTTPS_CERT_PATH && HTTPS_KEY_PATH && fs.existsSync(HTTPS_CERT_PATH) && fs.existsSync(HTTPS_KEY_PATH)) {
    const credentials = {
      key: fs.readFileSync(HTTPS_KEY_PATH),
      cert: fs.readFileSync(HTTPS_CERT_PATH)
    };
    if (HTTPS_CA_PATH && fs.existsSync(HTTPS_CA_PATH)) {
      credentials.ca = fs.readFileSync(HTTPS_CA_PATH);
    }
    return https.createServer(credentials, app);
  }
  return http.createServer(app);
};

const server = createServer();
const protocol = (HTTPS_CERT_PATH && HTTPS_KEY_PATH) ? 'https' : 'http';

// Middleware

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_session_secret_change_in_production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Data stores
const products = [];
const PAYMENT_APPROVAL_TIMEOUT = 10 * 60 * 1000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Payments directory
const paymentsDir = path.join(__dirname, 'PaymentsDB');
if (!fs.existsSync(paymentsDir)) {
  fs.mkdirSync(paymentsDir, { recursive: true });
}

// Helper functions
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getUserFromSession(sessionId) {
  const session = db.getSession(sessionId);
  if (!session) return null;
  return { username: session.username, email: session.email, role: session.role, profile_pic: session.profile_pic };
}

function requireAuth(req, res, next) {
  const sessionId = req.header('X-Session-Id');
  const user = getUserFromSession(sessionId);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please login to continue.', action: 'login' });
  }
  req.user = user;
  next();
}

function verifyAdminToken(req, res, next) {
  const token = req.header('X-Admin-Token');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  const data = db.readDB();
  const session = Object.values(data.sessions).find(s => s.token === token);
  if (!session) return res.status(401).json({ message: 'Unauthorized' });
  const user = db.findUserById(session.user_id);
  if (!user || user.role !== 'admin') return res.status(401).json({ message: 'Unauthorized' });
  next();
}

function getSessionCart(sessionId) {
  const data = db.readDB();
  return data.carts[sessionId] || {};
}

function getCartTotals(cart) {
  return Object.entries(cart).reduce((sum, [productId, quantity]) => {
    const product = products.find(p => p.id === productId);
    return product ? sum + product.price * quantity : sum;
  }, 0);
}

function findProduct(productId) {
  return products.find(p => p.id === productId);
}

function loadProducts() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'ProductsDB', 'products.json'), 'utf8');
    const loadedProducts = JSON.parse(data);
    products.length = 0;
    loadedProducts.forEach(p => products.push(p));
    console.log(`[startup] Loaded ${products.length} products`);
  } catch (error) {
    console.error('Failed to load products:', error);
  }
}

function saveProducts() {
  try {
    fs.writeFileSync(path.join(__dirname, 'ProductsDB', 'products.json'), JSON.stringify(products, null, 2));
  } catch (error) {
    console.error('Failed to save products:', error);
  }
}

// Ensure products are loaded on server start
loadProducts();


function addMessageToChat(paymentId, message) {
  db.addMessage(paymentId, message.from, message.text);
}

// Function to handle payment approval timeout
function handlePaymentTimeout(paymentId) {
  const payment = db.getPayment(paymentId);
  if (payment && payment.status === 'pending') {
    db.updatePaymentStatus(paymentId, 'rejected');
    db.addMessage(paymentId, 'system', 'Your payment has been automatically rejected due to timeout (10 minutes exceeded).');
  }
}

// Generate invoice PDF
function generateInvoicePDF(payment) {
  const { jsPDF } = require('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 10;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  doc.setFontSize(18);
  doc.text('7 Pharmaceuticals Ltd', margin, y);
  y += 10;

  doc.setFontSize(14);
  doc.text('INVOICE', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.text(`Invoice ID: ${payment.id}`, margin, y);
  y += 5;
  doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y);
  y += 5;
  doc.text(`Customer: ${payment.username}`, margin, y);
  y += 15;

  const colPrice = margin;
  const colSubtotal = pageWidth - margin - 30;

  y += 5;
  doc.line(margin, y, margin + contentWidth, y);
  y += 8;
  doc.setFontSize(10);
  doc.text('Subtotal:', colPrice, y);
  doc.text(`PGK ${payment.total.toFixed(2)}`, colSubtotal, y, { align: 'right' });
  y += 6;
  doc.text('GST (10%):', colPrice, y);
  const gst = payment.total * 0.10;
  doc.text(`PGK ${gst.toFixed(2)}`, colSubtotal, y, { align: 'right' });
  y += 8;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('Total (incl. GST):', colPrice, y);
  const totalWithGst = payment.total + gst;
  doc.text(`PGK ${totalWithGst.toFixed(2)}`, colSubtotal, y, { align: 'right' });

  const invoicePath = path.join(paymentsDir, `${payment.id}-invoice.pdf`);
  doc.save(invoicePath);
  return invoicePath;
}

// Generate receipt PDF
function generateReceiptPDF(payment) {
  const { jsPDF } = require('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 10;
  let y = margin;

  doc.setFontSize(18);
  doc.text('7 Pharmaceuticals Ltd', margin, y);
  y += 10;

  doc.setFontSize(14);
  doc.text('PAYMENT RECEIPT', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.text(`Receipt ID: ${payment.id}-receipt`, margin, y);
  y += 5;
  doc.text(`Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin, y);
  y += 5;
  doc.text(`Payment ID: ${payment.id}`, margin, y);
  y += 15;

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Payment Details:', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Amount Paid: PGK ${payment.total.toFixed(2)}`, margin, y);
  y += 5;
  doc.text(`Status: Verified`, margin, y);
  y += 5;
  doc.text(`Verified At: ${new Date(payment.verifiedAt).toLocaleString()}`, margin, y);
  y += 15;

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Items Purchased:', margin, y);
  y += 8;

  payment.items.forEach(item => {
    const { name, quantity, price } = item;
    const subtotal = price * quantity;
    doc.setFontSize(9);
    doc.text(`${name} (x${quantity}) - PGK ${subtotal.toFixed(2)}`, margin, y);
    y += 6;
  });

  y += 10;
  doc.setFontSize(10);
  doc.setFont(undefined, 'italic');
  doc.text('Thank you for your purchase!', margin, y);

  const receiptPath = path.join(paymentsDir, `${payment.id}-receipt.pdf`);
  doc.save(receiptPath);
  return receiptPath;
}

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, paymentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `payment-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  }
});

// Profile picture storage
const profilePicsDir = path.join(__dirname, 'ProfilePics');
if (!fs.existsSync(profilePicsDir)) {
  fs.mkdirSync(profilePicsDir, { recursive: true });
}

const profileUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, profilePicsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `profile-${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`);
    }
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// Routes

// Products - public endpoint
app.get('/api/products', (req, res) => {
  res.json(products);
});

// Cart endpoints - no auth required for guest users
app.get('/api/cart', (req, res) => {
  const sessionId = req.header('X-Session-Id');
  const cart = getSessionCart(sessionId) || {};
  res.json({ cart, products });
});

app.post('/api/cart/add', (req, res) => {
  // Prevent cart modifications in guest mode.
  // If user isn't authenticated, require login.
  const sessionId = req.header('X-Session-Id');
  const user = getUserFromSession(sessionId);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login to continue.',
      action: 'login'
    });
  }

  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ message: 'productId is required' });
  }

  const product = findProduct(productId);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  if (product.inventory <= 0) {
    return res.status(400).json({ message: 'Out of stock' });
  }

  const data = db.readDB();
  const cart = data.carts[sessionId] || {};
  cart[productId] = (cart[productId] || 0) + 1;
  db.withLock(d => { d.carts[sessionId] = cart; });

  // Stock is finalized only at payment verification.
  // Cart is treated as a selection/reservation, not a decrement of main inventory.
  res.json({ cart, products });
});

app.post('/api/cart/remove', (req, res) => {
  const sessionId = req.header('X-Session-Id');
  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ message: 'productId is required' });
  }

  const product = findProduct(productId);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const data = db.readDB();
  const cart = data.carts[sessionId] || {};
  const current = cart[productId] || 0;
  if (current <= 0) {
    return res.status(400).json({ message: 'Product is not in the cart' });
  }

  if (current > 1) {
    cart[productId] = current - 1;
  } else {
    delete cart[productId];
  }
  db.withLock(d => { d.carts[sessionId] = cart; });

  // Stock is finalized only at payment verification.
  res.json({ cart, products });
});

app.post('/api/cart/checkout', requireAuth, (req, res) => {
  const sessionId = req.header('X-Session-Id');
  const data = db.readDB();
  const cart = data.carts[sessionId] || {};
  if (!cart || Object.keys(cart).length === 0) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  const total = getCartTotals(cart);
  db.withLock(d => { d.carts[sessionId] = {}; });
  res.json({ success: true, total, products });
});

// Auth endpoints

// Login endpoint - for phone/password login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = generateToken();
    const sessionId = `admin_session_${token}`;
    let adminUser = db.findUserByEmail(username);
    if (!adminUser) {
      adminUser = db.createUser({ email: username, username, role: 'admin' });
    }
    db.createSession(sessionId, adminUser.id, token, { role: 'admin', username: adminUser.username, email: adminUser.email });
    return res.json({ success: true, token, sessionId, role: 'admin', username });
  }

  if (username && password) {
    // Look up by phone email format or username
    let existingUser = db.findUserByEmail(username);
    if (!existingUser) {
      const data = db.readDB();
      existingUser = Object.values(data.users).find(u => u.username === username);
    }
    if (existingUser && existingUser.password === password) {
      const token = generateToken();
      const sessionId = `user_session_${token}`;
      db.createSession(sessionId, existingUser.id, token, { role: existingUser.role, username: existingUser.username, email: existingUser.email, profile_pic: existingUser.profile_pic });
      return res.json({ success: true, token, sessionId, role: 'user', username: existingUser.username, email: existingUser.email, profilePic: existingUser.profile_pic });
    }
  }

  res.status(401).json({ message: 'Invalid phone number or password' });
});

// Social auth registration/login endpoint
app.post('/api/auth/social', (req, res) => {
  const { provider, email, username, profilePic, password } = req.body;

  if (!provider || !email) {
    return res.status(400).json({ message: 'Provider and email are required' });
  }

  let user = db.findUserByEmail(email);
  if (!user) {
    user = db.createUser({
      email,
      username: username || email.split('@')[0],
      password: password || null,
      provider,
      profilePic
    });
  }

  const token = generateToken();
  const sessionId = `user_session_${token}`;
  db.createSession(sessionId, user.id, token, { role: user.role, username: user.username, email: user.email, profile_pic: user.profile_pic });

  res.json({
    success: true,
    token,
    sessionId,
    role: 'user',
    username: user.username,
    email: user.email,
    profilePic: user.profile_pic
  });
});

// Phone registration endpoint
app.post('/api/auth/register', (req, res) => {
  const { phone, username, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ success: false, message: 'Phone number and password are required.' });
  }

  // Validate phone format (7-8 digits after +675)
  if (!/^\d{7,8}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Phone number must be 7-8 digits.' });
  }

  const userEmail = '675' + phone + '@phone.local';
  const finalUsername = username || 'phone_' + phone;

  // Check if user already exists
  const existingUser = db.findUserByEmail(userEmail);
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Phone number already registered.' });
  }

  // Check if username is taken (if provided)
  if (username) {
    const data = db.readDB();
    const usernameTaken = Object.values(data.users).some(u => u.username === username);
    if (usernameTaken) {
      return res.status(400).json({ success: false, message: 'Username already taken. Choose another.' });
    }
  }

  // Create new user
  const newUser = db.createUser({
    email: userEmail,
    username: finalUsername,
    password: password,
    provider: 'phone',
    profilePic: null
  });

  // Auto-login after registration
  const token = generateToken();
  const sessionId = `user_session_${token}`;
  db.createSession(sessionId, newUser.id, token, { role: newUser.role, username: newUser.username, email: newUser.email, profile_pic: newUser.profile_pic });

  res.json({
    success: true,
    token,
    sessionId,
    role: newUser.role,
    username: newUser.username,
    email: newUser.email,
    profilePic: newUser.profile_pic
  });
});

// Check session endpoint
app.get('/api/auth/session', (req, res) => {
  const sessionId = req.header('X-Session-Id');
  const user = getUserFromSession(sessionId);
  
  if (user) {
    res.json({ authenticated: true, user });
  } else {
    res.json({ authenticated: false });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.header('X-Session-Id');
  db.deleteSession(sessionId);
  res.json({ success: true, message: 'Logged out successfully' });
});

// Payment upload - require authentication
app.post('/api/payment/upload', requireAuth, upload.fields([
  { name: 'paymentProof', maxCount: 1 },
  { name: 'proformaInvoice', maxCount: 1 }
]), (req, res) => {
  try {
    const sessionId = req.header('X-Session-Id');
    const cart = getSessionCart(sessionId);

    if (!cart || Object.keys(cart).length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    if (!req.files || !req.files.paymentProof) {
      return res.status(400).json({ message: 'Payment proof image is required' });
    }

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const total = getCartTotals(cart);
    const cartItems = Object.entries(cart).map(([productId, quantity]) => {
      const product = findProduct(productId);
      return { productId, quantity, name: product?.name, price: product?.price };
    });

    const currentUser = db.findUserByEmail(req.user.email);
    const userId = currentUser ? currentUser.id : null;

    db.createPayment({
      id: paymentId,
      userId,
      username: req.user.username || 'Customer',
      email: req.user.email || '',
      total,
      items: cartItems,
      fileName: req.files.paymentProof[0].filename,
      filePath: req.files.paymentProof[0].path,
      proformaFileName: req.files.proformaInvoice ? req.files.proformaInvoice[0].filename : null,
      proformaFilePath: req.files.proformaInvoice ? req.files.proformaInvoice[0].path : null
    });

    setTimeout(() => {
      handlePaymentTimeout(paymentId);
    }, PAYMENT_APPROVAL_TIMEOUT);

    db.addMessage(paymentId, 'system', 'Payment proof uploaded. Awaiting admin verification.');

    db.withLock(d => { d.carts[sessionId] = {}; });

    res.json({
      success: true,
      paymentId,
      message: 'Payment proof uploaded. Awaiting admin verification.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed: ' + error.message });
  }
});

// Profile picture upload
app.post('/api/profile/upload', profileUpload.single('profilePic'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.json({ success: true, url: `/ProfilePics/${req.file.filename}` });
});

// Admin endpoints
app.get('/api/admin/payments', verifyAdminToken, (req, res) => {
  const pendingPayments = db.getAllPendingPayments();
  res.json({ payments: pendingPayments });
});

app.post('/api/admin/payments/:paymentId/verify', verifyAdminToken, (req, res) => {
   const { paymentId } = req.params;
   const payment = db.getPayment(paymentId);

   if (!payment) {
     return res.status(404).json({ message: 'Payment not found' });
   }

   // Idempotency: if already verified, do not deduct stock again.
   if (payment.status === 'verified') {
     const refreshedPayment = db.getPayment(paymentId);

     // Idempotent behavior: do not re-deduct stock and do not spam system messages.
     // Invoice/receipt endpoints will generate PDFs on-demand if missing.
     return res.json({
       success: true,
       message: 'Payment already verified. Inventory is already finalized.',
       payment: refreshedPayment,
       invoiceUrl: `/api/admin/payments/${paymentId}/invoice`,
       receiptUrl: `/api/admin/payments/${paymentId}/receipt`
     });
   }

   // Only finalize stock when moving from pending -> verified.
   // Safety check: ensure stock is sufficient for every item before deducting any.
   const items = Array.isArray(payment.items) ? payment.items : [];

   function resolveProductForItem(item) {
     const productId =
       item.productId ??
       item.product_id ??
       item.id ??
       item.productID ??
       null;

     const qty = Number(item.quantity ?? 0);

     // Preferred: lookup by id/productId
     if (productId != null) {
       const p = findProduct(productId);
       if (p) return { product: p, quantity: qty };
     }

     // Fallback: lookup by name (handles historical payloads with only name)
     if (item.name) {
       const p = products.find(p2 => p2.name === item.name);
       if (p) return { product: p, quantity: qty };
     }

     return { product: null, quantity: qty };
   }

   // Safety check: ensure stock is sufficient for every item before deducting any.
   for (const item of items) {
     const { product, quantity } = resolveProductForItem(item);

     if (!product) {
       return res.status(400).json({
         message: `Product not found for payment item (productId/name missing or mismatched)`
       });
     }

     if (!Number.isFinite(quantity) || quantity <= 0) {
       return res.status(400).json({
         message: `Invalid quantity for ${product.name}. Quantity: ${item.quantity}`
       });
     }

     if (product.inventory < quantity) {
       return res.status(400).json({
         message: `Insufficient stock for ${product.name}. Requested: ${quantity}, Available: ${product.inventory}`
       });
     }
   }

   // Deduct inventory from main products.json exactly once.
   items.forEach(item => {
     const { product, quantity } = resolveProductForItem(item);
     if (!product) return;

     product.inventory -= quantity;
     if (product.inventory < 0) product.inventory = 0; // extra safety clamp
   });

   saveProducts();

   db.updatePaymentStatus(paymentId, 'verified');

   const refreshedPayment = db.getPayment(paymentId);
   const invoicePath = generateInvoicePDF(refreshedPayment);
   const receiptPath = generateReceiptPDF(refreshedPayment);

  db.addMessage(paymentId, 'system', 'Your payment has been verified and approved!');
  db.addMessage(paymentId, 'system', 'Invoice and receipt have been generated and are available for download.');
  db.addMessage(paymentId, 'system', 'Congratulations on your purchase! Please contact us at +675 7985 6215 or email 7pharmawholesale@gmail.com to arrange delivery.');

  res.json({
    success: true,
    message: 'Payment verified. Inventory has been finalized.',
    payment: refreshedPayment,
    invoiceUrl: `/api/admin/payments/${paymentId}/invoice`,
    receiptUrl: `/api/admin/payments/${paymentId}/receipt`
  });
});

app.get('/api/admin/payments/:paymentId', verifyAdminToken, (req, res) => {
  const { paymentId } = req.params;
  const payment = db.getPayment(paymentId);

  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  res.json({ payment });
});

app.get('/api/admin/payments/:paymentId/invoice', verifyAdminToken, (req, res) => {
  const { paymentId } = req.params;
  const payment = db.getPayment(paymentId);

  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  if (payment.status !== 'verified') {
    return res.status(400).json({ message: 'Payment not verified yet' });
  }

  const invoicePath = path.join(paymentsDir, `${paymentId}-invoice.pdf`);
  if (fs.existsSync(invoicePath)) {
    res.download(invoicePath);
  } else {
    const generatedPath = generateInvoicePDF(payment);
    res.download(generatedPath);
  }
});

app.get('/api/admin/payments/:paymentId/receipt', verifyAdminToken, (req, res) => {
  const { paymentId } = req.params;
  const payment = db.getPayment(paymentId);

  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  if (payment.status !== 'verified') {
    return res.status(400).json({ message: 'Payment not verified yet' });
  }

  const receiptPath = path.join(paymentsDir, `${paymentId}-receipt.pdf`);
  if (fs.existsSync(receiptPath)) {
    res.download(receiptPath);
  } else {
    const generatedPath = generateReceiptPDF(payment);
    res.download(generatedPath);
  }
});

// Chat endpoints
app.get('/api/chat/:paymentId', verifyAdminToken, (req, res) => {
  const { paymentId } = req.params;
  const chatMessages = db.getMessages(paymentId);
  res.json({ messages: chatMessages });
});

app.post('/api/chat/:paymentId', verifyAdminToken, (req, res) => {
  const { paymentId } = req.params;
  const { text } = req.body;

  if (!text || text.trim() === '') {
    return res.status(400).json({ message: 'Message text is required' });
  }

  const payment = db.getPayment(paymentId);
  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  db.addMessage(paymentId, 'admin', text.trim());

  res.json({ success: true, message: { from: 'admin', text: text.trim() } });
});

// User chat endpoints
app.get('/api/user/chat/:paymentId', (req, res) => {
  const { paymentId } = req.params;
  const chatMessages = db.getMessages(paymentId);
  res.json({ messages: chatMessages });
});

app.post('/api/user/chat/:paymentId', (req, res) => {
  const { paymentId } = req.params;
  const { text } = req.body;

  if (!text || text.trim() === '') {
    return res.status(400).json({ message: 'Message text is required' });
  }

  const payment = db.getPayment(paymentId);
  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  db.addMessage(paymentId, 'user', text.trim());

  res.json({ success: true, message: { from: 'user', text: text.trim() } });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.static(path.join(__dirname)));

// Error handling middleware
app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

server.listen(port, () => {
  console.log(`Server running at ${protocol}://localhost:${port}`);
});