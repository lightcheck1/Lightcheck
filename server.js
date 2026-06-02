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
app.get('/',         (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

function faceppRequest(path, params) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify(params);
    const options = {
      hostname: 'api-us.faceplusplus.com',
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
