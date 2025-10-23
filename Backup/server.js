// --- Imports ---
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const app = express();

// --- Settings ---
app.set('trust proxy', true); // permite citirea IP-ului real când e proxiat (ex: prin ngrok)

// --- Middleware ---
const allowedOrigins = [
  'https://air-therm.com',
  'http://air-therm.com',
  'https://www.air-therm.com',
  'http://www.air-therm.com',
  'http://localhost:3000',
  'https://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked:', origin);
      callback(new Error('CORS not allowed for this origin: ' + origin));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(express.json());
app.use(express.static(__dirname)); // Servește fișierele statice (ex: monitor.html)

// --- Helper: Get approximate location by IP ---
async function getGeoInfo(ip) {
  try {
    const res = await axios.get(`https://ipapi.co/${ip}/json/`);
    return {
      ip: ip,
      country: res.data.country_name || 'Unknown',
      city: res.data.city || 'Unknown',
    };
  } catch (err) {
    console.warn('⚠️ Geo lookup failed for IP:', ip);
    return { ip, country: 'Unknown', city: 'Unknown' };
  }
}

// --- Root route ---
app.get('/', (req, res) => {
  res.send('✅ Monitoring server is running!');
});

// --- POST /track route ---
app.post('/track', async (req, res) => {
  console.log('📩 Received POST on /track');
  const data = req.body;

  const clientIp =
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.socket.remoteAddress?.replace('::ffff:', '') ||
    'Unknown';

  const geo = await getGeoInfo(clientIp);

  const record = {
    ...data,
    ip: geo.ip,
    country: geo.country,
    city: geo.city,
    timestamp: new Date().toISOString(),
  };

  const logFile = path.join(__dirname, 'visits.log');
  fs.appendFileSync(logFile, JSON.stringify(record) + '\n', 'utf8');

  console.log('💾 Saved visit:', record);
  res.status(200).json({ message: 'OK' });
});

// --- GET /visits route ---
app.get('/visits', (req, res) => {
  const logFile = path.join(__dirname, 'visits.log');
  if (!fs.existsSync(logFile)) {
    console.log('⚠️ No visits yet');
    return res.json([]);
  }

  try {
    const visits = fs
      .readFileSync(logFile, 'utf8')
      .trim()
      .split('\n')
      .map(line => JSON.parse(line))
      .reverse();

    res.json(visits);
  } catch (err) {
    console.error('❌ Error reading visits.log:', err);
    res.status(500).json({ error: 'Failed to read visits' });
  }
});

// --- OPTIONS /track (CORS preflight) ---
app.options('/track', cors(), (req, res) => res.sendStatus(200));

// --- Start server ---
const PORT = 3000;
app.listen(PORT, () => {
  console.log('✅ Server started and routes registered...');
  console.log(`🚀 Running on http://localhost:${PORT}`);
  console.log('🛰️  Serving static files (monitor.html available)');
});
