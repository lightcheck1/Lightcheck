const express  = require('express');
const https    = require('https');
const querystring = require('querystring');
const path = require('path');
const app = express();

app.use(express.json({ limit: '10mb' }));

// Serve static files with .html extension fallback
app.use(express.static('.', { extensions: ['html'] }));

// Explicit routes for each page (handles /attend, /admin, /index)
app.get('/attend',   (req, res) => res.sendFile(path.join(__dirname, 'attend.html')));
app.get('/admin',    (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/index',    (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/rapports', (req, res) => res.sendFile(path.join(__dirname, 'rapports.html')));
app.get('/users',    (req, res) => res.sendFile(path.join(__dirname, 'users.html')));
app.get('/groups',    (req, res) => res.sendFile(path.join(__dirname, 'groups.html')));
app.get('/schedules',    (req, res) => res.sendFile(path.join(__dirname, 'schedules.html')));
app.get('/appointments',(req, res) => res.sendFile(path.join(__dirname, 'appointments.html')));
app.get('/settings',    (req, res) => res.sendFile(path.join(__dirname, 'settings.html')));
app.get('/',            (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const FACEPP_HOSTS = ['api-us.faceplusplus.com', 'api-cn.faceplusplus.com'];
// Cache the working host per api_key to avoid retrying every time
const hostCache = {};

function faceppRequestHost(hostname, path, params) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify(params);
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Réponse Face++ invalide')); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function faceppRequest(path, params) {
  const cacheKey = params.api_key || 'default';

  // Use cached host if available
  if (hostCache[cacheKey]) {
    return faceppRequestHost(hostCache[cacheKey], path, params);
  }

  // Try US first, then CN — auto-detect the right region for these keys
  for (const host of FACEPP_HOSTS) {
    const result = await faceppRequestHost(host, path, params);
    if (result.error_message && result.error_message.includes('AUTHENTICATION_ERROR')) {
      console.log(`[Face++] ${host} → AUTHENTICATION_ERROR, trying next host…`);
      continue;
    }
    // This host works — cache it
    hostCache[cacheKey] = host;
    console.log(`[Face++] Using host: ${host}`);
    return result;
  }

  // Both failed — return the last error
  hostCache[cacheKey] = FACEPP_HOSTS[0];
  return faceppRequestHost(FACEPP_HOSTS[0], path, params);
}

app.post('/api/detect', async (req, res) => {
  try {
    const { api_key, api_secret, image_base64 } = req.body;
    if (!api_key || !api_secret || !image_base64) {
      return res.status(400).json({ error: 'Paramètres manquants.' });
    }
    const result = await faceppRequest('/facepp/v3/detect', {
      api_key, api_secret, image_base64, return_attributes: 'none'
    });
    res.json(result);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/compare', async (req, res) => {
  try {
    const { api_key, api_secret, face_token1, face_token2 } = req.body;
    if (!api_key || !api_secret || !face_token1 || !face_token2) {
      return res.status(400).json({ error: 'Paramètres manquants.' });
    }
    const result = await faceppRequest('/facepp/v3/compare', {
      api_key, api_secret, face_token1, face_token2
    });
    res.json(result);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✓ Light Check running on port ${PORT}`));
