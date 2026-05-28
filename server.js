require('dotenv').config();
const express     = require('express');
const helmet      = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit   = require('express-rate-limit');
const path        = require('path');
const { initDB }  = require('./config/db');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests' }
});
app.use(globalLimiter);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api',      require('./routes/api'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 8000;

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Mural Management running on http://localhost:${PORT}`);
    console.log('👤 Default users: admin / editor / viewer  (password: password)');
  });
});
