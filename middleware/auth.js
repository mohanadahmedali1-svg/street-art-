const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'mural_super_secret_key_2024_change_in_prod';

function authenticate(req, res, next) {
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

function allowOnly(...fields) {
  return (req, res, next) => {
    const filtered = {};
    fields.forEach(f => { if (req.body[f] !== undefined) filtered[f] = req.body[f]; });
    req.body = filtered;
    next();
  };
}

module.exports = { authenticate, authorize, allowOnly, JWT_SECRET };
