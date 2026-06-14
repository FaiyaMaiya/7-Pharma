const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./db');
db.ensureFile();

const HTTPS_KEY_PATH = (process.env.HTTPS_KEY_PATH || '').trim();
const HTTPS_CERT_PATH = (process.env.HTTPS_CERT_PATH || '').trim();
const HTTPS_CA_PATH = (process.env.HTTPS_CA_PATH || '').trim();

const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
const facebookAppId = (process.env.FACEBOOK_APP_ID || '').trim();
const facebookAppSecret = (process.env.FACEBOOK_APP_SECRET || '').trim();

const app = express();
const http = require('http');
const https = require('https');
const port = process.env.PORT || 3000;

// Trust the first proxy (e.g., nginx / load balancer) so req.secure
// correctly respects X-Forwarded-Proto when SSL is terminated upstream.
app.set('trust proxy', 1);

// CORS: only reflect allowed origins in production.
// Set CORS_ORIGIN to a comma-separated list of allowed origins.
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((s) => s.trim());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || corsOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
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

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Serialize/deserialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

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
    loadedProducts.forEach(p => products.push(p));
  } catch (error) {
    console.error('Failed to load products:', error);
  }
}

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

// Cart endpoints - require authentication
app.get('/api/cart', requireAuth, (req, res) => {
  const sessionId = req.header('X-Session-Id');
  const cart = getSessionCart(sessionId) || {};
  res.json({ cart, products });
});

app.post('/api/cart/add', requireAuth, (req, res) => {
  const sessionId = req.header('X-Session-Id');
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
  product.inventory -= 1;

  res.json({ cart, products });
});

app.post('/api/cart/remove', requireAuth, (req, res) => {
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
  product.inventory += 1;

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

// OAuth Routes - initiate Google/Facebook login
if (!isPlaceholder(googleClientId) && !isPlaceholder(googleClientSecret)) {
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/failure' }),
    (req, res) => {
      const user = req.user;
      const token = generateToken();
      const sessionId = `oauth_session_${token}`;
      let existingUser = db.findUserByEmail(user.email);
      if (!existingUser) {
        existingUser = db.createUser({
          email: user.email,
          username: user.username,
          provider: user.provider,
          profilePic: user.profilePic
        });
      }
      db.createSession(sessionId, existingUser.id, token, { ...existingUser, token });
      req.session.user = { ...existingUser, token, sessionId };
      req.session.sessionId = sessionId;
      res.redirect(process.env.OAUTH_SUCCESS_REDIRECT || '/auth/success?sessionId=' + encodeURIComponent(sessionId) + '&token=' + encodeURIComponent(token) + '&role=user&username=' + encodeURIComponent(existingUser.username) + '&email=' + encodeURIComponent(existingUser.email) + (existingUser.profilePic ? '&profilePic=' + encodeURIComponent(existingUser.profilePic) : ''));
    }
  );
} else {
  app.get('/auth/google', (req, res) => res.status(501).json({ message: 'Google OAuth is not configured on the server.' }));
  app.get('/auth/google/callback', (req, res) => res.status(501).json({ message: 'Google OAuth is not configured on the server.' }));
}

if (!isPlaceholder(facebookAppId) && !isPlaceholder(facebookAppSecret)) {
  app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
  app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/auth/failure' }),
    (req, res) => {
      const user = req.user;
      const token = generateToken();
      const sessionId = `oauth_session_${token}`;
      let existingUser = db.findUserByEmail(user.email);
      if (!existingUser) {
        existingUser = db.createUser({
          email: user.email,
          username: user.username,
          provider: user.provider,
          profilePic: user.profilePic
        });
      }
      db.createSession(sessionId, existingUser.id, token, { ...existingUser, token });
      req.session.user = { ...existingUser, token, sessionId };
      req.session.sessionId = sessionId;
      res.redirect('/auth/success?sessionId=' + encodeURIComponent(sessionId) + '&token=' + encodeURIComponent(token) + '&role=user&username=' + encodeURIComponent(existingUser.username) + '&email=' + encodeURIComponent(existingUser.email) + (existingUser.profilePic ? '&profilePic=' + encodeURIComponent(existingUser.profilePic) : ''));
    }
  );
} else {
  app.get('/auth/facebook', (req, res) => res.status(501).json({ message: 'Facebook OAuth is not configured on the server.' }));
  app.get('/auth/facebook/callback', (req, res) => res.status(501).json({ message: 'Facebook OAuth is not configured on the server.' }));
}

app.get('/auth/failure', (req, res) => {
  res.redirect('/login.html?error=auth_failed');
});

app.get('/auth/success', (req, res) => {
  res.redirect('/login.html?auth=success' + Object.entries(req.query).map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join(''));
});

// Login endpoint - for email/password login
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
    let existingUser = db.findUserByEmail(username);
    if (!existingUser) {
      existingUser = db.findUserByEmail(username.includes('@') ? username : username + '@example.com');
    }
    if (!existingUser) {
      const data = db.readDB();
      existingUser = Object.values(data.users).find(u => u.username === username);
    }
    if (existingUser && existingUser.password === password) {
      const token = generateToken();
      const sessionId = `user_session_${token}`;
      db.createSession(sessionId, existingUser.id, token, { role: existingUser.role, username: existingUser.username, email: existingUser.email, profile_pic: existingUser.profile_pic });
      return res.json({ success: true, token, sessionId, role: 'user', username: existingUser.username, email: existingUser.email });
    }

    const token = generateToken();
    const sessionId = `user_session_${token}`;
    const userData = { username, email: username.includes('@') ? username : username + '@example.com', role: 'user' };
    const newUser = db.createUser({ email: userData.email, username: userData.username, role: 'user', password: password });
    db.createSession(sessionId, newUser.id, token, { role: 'user', username: userData.username, email: userData.email });
    return res.json({ success: true, token, sessionId, role: 'user', username: userData.username });
  }

  res.status(401).json({ message: 'Invalid username or password' });
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

  db.updatePaymentStatus(paymentId, 'verified');

  const data = db.readDB();
  const cart = data.carts[payment.user_id] || {};
  db.withLock(d => { d.carts[payment.user_id] = {}; });

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

function isPlaceholder(value) {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return v.startsWith('your_') || v.startsWith('replace_with_your_') || v.includes('_client_id') || v.includes('_app_id') || v.includes('_client_secret') || v.includes('_app_secret') || v.includes('placeholder') || v.includes('example');
}

// OAuth strategies must be registered after session/passport init
if (!isPlaceholder(googleClientId) && !isPlaceholder(googleClientSecret)) {
  try {
    passport.use(new GoogleStrategy({
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
    }, (accessToken, refreshToken, profile, done) => {
      const user = {
        provider: 'google',
        providerId: profile.id,
        email: profile.emails && profile.emails[0] ? profile.emails[0].value : '',
        username: profile.displayName || (profile.emails && profile.emails[0] ? profile.emails[0].value.split('@')[0] : 'GoogleUser'),
        profilePic: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
        firstName: profile.name ? profile.name.givenName : '',
        lastName: profile.name ? profile.name.familyName : ''
      };
      return done(null, user);
    }));
  } catch (err) {
    console.warn('Google OAuth strategy skipped:', err.message);
  }
}

if (!isPlaceholder(facebookAppId) && !isPlaceholder(facebookAppSecret)) {
  try {
    passport.use(new FacebookStrategy({
      clientID: facebookAppId,
      clientSecret: facebookAppSecret,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3000/auth/facebook/callback',
      profileFields: ['id', 'emails', 'name', 'picture.type(large)']
    }, (accessToken, refreshToken, profile, done) => {
      const name = profile.name || {};
      const user = {
        provider: 'facebook',
        providerId: profile.id,
        email: profile.emails && profile.emails[0] ? profile.emails[0].value : '',
        username: profile.displayName || `${name.givenName || ''} ${name.familyName || ''}`.trim() || 'FacebookUser',
        profilePic: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
        firstName: name.givenName || '',
        lastName: name.familyName || ''
      };
      return done(null, user);
    }));
  } catch (err) {
    console.warn('Facebook OAuth strategy skipped:', err.message);
  }
}

server.listen(port, () => {
  console.log(`Server running at ${protocol}://localhost:${port}`);
});

loadProducts();