// --- Imports ---
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const app = express();

// --- Settings ---
app.set('trust proxy', true);

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
app.use(express.static(__dirname)); // Servește fișierele statice

// --- Helper: get approximate location by IP (now includes postal code) ---
async function getGeoInfo(ip) {
  try {
    // 🌍 First try ipwho.is
    const res = await axios.get(`https://ipwho.is/${ip}`);
    if (res.data && res.data.success) {
      return {
        ip: ip,
        country: res.data.country || 'Unknown',
        city: res.data.city || 'Unknown',
        postal: res.data.postal || 'Unknown' // ✅ Added postal
      };
    } else {
      console.warn('⚠️ ipwho.is failed, trying fallback (ipapi.co)...');
    }
  } catch (err) {
    console.warn('⚠️ Error contacting ipwho.is:', err.message);
  }

  // 🌎 Fallback: ipapi.co
  try {
    const fallback = await axios.get(`https://ipapi.co/${ip}/json/`);
    return {
      ip: ip,
      country: fallback.data.country_name || 'Unknown',
      city: fallback.data.city || 'Unknown',
      postal: fallback.data.postal || 'Unknown' // ✅ Added postal
    };
  } catch (err2) {
    console.warn('⚠️ Fallback (ipapi.co) also failed:', err2.message);
    return { ip, country: 'Unknown', city: 'Unknown', postal: 'Unknown' }; // ✅ Added postal
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
    postal: geo.postal, // ✅ Added postal
    timestamp: new Date().toISOString(),
  };

  const logFile = path.join(__dirname, 'visits.log');
  fs.appendFileSync(logFile, JSON.stringify(record) + '\n', 'utf8');
  // --- Trimite și către Google Sheet ---
try {
  await axios.post(
    'https://script.google.com/macros/s/AKfycbw7KlQVZNVBVvrxFFpSqR9rt6cHido4ownu4yG2Y6nkHtwGNv06pu1YGyV_EqFJkqiu/exec',
    record
  );
  console.log('📤 Trimis și în Google Sheet');
} catch (err) {
  console.warn('⚠️ Nu s-a putut trimite în Google Sheet:', err.message);
}

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
