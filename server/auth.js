const crypto = require('crypto');

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const sessions = new Map();
const SECRET = process.env.ADMIN_PASSWORD || 'kalebia2024';

function signPayload(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

function createToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  return payload + '.' + signPayload(payload);
}

function revokeToken(token) {
  sessions.delete(token);
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function isValidToken(token) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length === 2) {
    const [payload, sig] = parts;
    if (sig !== signPayload(payload)) return false;
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      return Date.now() <= data.exp;
    } catch {
      return false;
    }
  }
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expires) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAuth(req, res, next) {
  if (!isValidToken(extractToken(req))) {
    res.status(401).json({ error: 'Session expirée ou non autorisée.' });
    return;
  }
  next();
}

module.exports = { createToken, revokeToken, extractToken, requireAuth };
