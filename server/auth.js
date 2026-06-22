const crypto = require('crypto');

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const sessions = new Map();

function createToken() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { expires: Date.now() + TOKEN_TTL_MS });
  return token;
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
