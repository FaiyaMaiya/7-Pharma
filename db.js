const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'app-data.json');
const LOCK_PATH = path.join(__dirname, 'app-data.lock');

function ensureFile() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({
      users: {},
      sessions: {},
      payments: {},
      messages: [],
      carts: {}
    }, null, 2));
  }
}

function readDB() {
  ensureFile();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function withLock(fn) {
  // Simple lock implementation - retry until lock is acquired
  const maxRetries = 100;
  let retries = 0;
  while (retries < maxRetries) {
    try {
      // Try to create lock file exclusively
      fs.writeFileSync(LOCK_PATH, Date.now().toString(), { flag: 'wx' });
      break;
    } catch (e) {
      // Lock exists, wait and retry
      retries++;
      if (retries >= maxRetries) {
        throw new Error('Could not acquire database lock');
      }
      // Wait a bit before retrying
      const start = Date.now();
      while (Date.now() - start < 50) { /* busy wait */ }
    }
  }
  try {
    const data = readDB();
    fn(data);
    writeDB(data);
  } finally {
    try { fs.unlinkSync(LOCK_PATH); } catch (e) { /* ignore */ }
  }
}

// ---------------------------
// User helpers
// ---------------------------
function findUserByEmail(email) {
  const data = readDB();
  return Object.values(data.users).find(u => u.email === email) || null;
}

function findUserById(id) {
  const data = readDB();
  return data.users[id] || null;
}

function createUser({ email, username, password, provider, profilePic, role }) {
  let userId;
  withLock(data => {
    const existing = Object.values(data.users).find(u => u.email === email);
    if (existing) {
      userId = existing.id;
      return;
    }
    userId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    data.users[userId] = {
      id: userId,
      email,
      username,
      password: password || null,
      provider: provider || 'email',
      profile_pic: profilePic || null,
      role: role || 'user',
      created_at: new Date().toISOString()
    };
  });
  return findUserById(userId);
}

function updateUserPassword(email, newPassword) {
  withLock(data => {
    const user = Object.values(data.users).find(u => u.email === email);
    if (user) user.password = newPassword;
  });
}

// ---------------------------
// Session helpers
// ---------------------------
function createSession(sessionId, userId, token, extraData) {
  withLock(data => {
    data.sessions[sessionId] = {
      session_id: sessionId,
      user_id: userId,
      token,
      data: extraData || null
    };
  });
}

function getSession(sessionId) {
  const data = readDB();
  const session = data.sessions[sessionId];
  if (!session) return null;
  const user = data.users[session.user_id];
  if (!user) return null;
  return { ...session, ...user };
}

function deleteSession(sessionId) {
  withLock(data => {
    delete data.sessions[sessionId];
  });
}

// ---------------------------
// Payment helpers
// ---------------------------
function createPayment({ id, userId, username, email, total, items, fileName, filePath, proformaFileName, proformaFilePath }) {
  withLock(data => {
    data.payments[id] = {
      id,
      user_id: userId,
      username,
      email: email || null,
      status: 'pending',
      total,
      items: JSON.stringify(items || []),
      file_name: fileName || null,
      file_path: filePath || null,
      proforma_file_name: proformaFileName || null,
      proforma_file_path: proformaFilePath || null,
      created_at: new Date().toISOString()
    };
  });
  return getPayment(id);
}

function updatePaymentStatus(id, status) {
  withLock(data => {
    if (data.payments[id]) {
      data.payments[id].status = status;
      data.payments[id].verified_at = new Date().toISOString();
    }
  });
}

function getPayment(id) {
  const data = readDB();
  const row = data.payments[id];
  if (!row) return null;
  try { row.items = JSON.parse(row.items); } catch (e) { row.items = []; }
  return row;
}

function getPendingPayments(userId) {
  const data = readDB();
  return Object.values(data.payments)
    .filter(p => p.user_id === userId && p.status === 'pending')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(row => { try { row.items = JSON.parse(row.items); } catch (e) { row.items = []; } return row; });
}

function getAllPendingPayments() {
  const data = readDB();
  return Object.values(data.payments)
    .filter(p => p.status === 'pending')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(row => { try { row.items = JSON.parse(row.items); } catch (e) { row.items = []; } return row; });
}

function getUserPayments(userId) {
  const data = readDB();
  return Object.values(data.payments)
    .filter(p => p.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(row => { try { row.items = JSON.parse(row.items); } catch (e) { row.items = []; } return row; });
}

// ---------------------------
// Message helpers
// ---------------------------
function addMessage(paymentId, fromUser, text) {
  withLock(data => {
    data.messages.push({
      payment_id: paymentId,
      from_user: fromUser,
      text,
      timestamp: new Date().toISOString()
    });
  });
}

function getMessages(paymentId) {
  const data = readDB();
  return data.messages
    .filter(m => m.payment_id === paymentId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function getSupportConversations() {
  const data = readDB();
  const seen = {};
  data.messages
    .filter(m => m.payment_id && m.payment_id.startsWith('support_'))
    .forEach(m => { seen[m.payment_id] = m.timestamp; });
  return Object.entries(seen)
    .map(([payment_id, timestamp]) => ({ payment_id, timestamp }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .map(r => ({ id: r.payment_id, last_message: r.timestamp }));
}

function clearCartForSession() { return; }

module.exports = {
  ensureFile,
  readDB,
  writeDB,
  withLock,
  findUserByEmail,
  findUserById,
  createUser,
  updateUserPassword,
  createSession,
  getSession,
  deleteSession,
  createPayment,
  updatePaymentStatus,
  getPayment,
  getPendingPayments,
  getAllPendingPayments,
  getUserPayments,
  clearCartForSession,
  addMessage,
  getMessages,
  getSupportConversations
};