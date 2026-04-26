const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/VITE_OPENROUTER_API_KEY="?([^"\n\r]+)"?/);
const API_KEY = match ? match[1] : null;

const testImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="; // Tiny 1x1 pixel

const postData = JSON.stringify({
  model: "google/gemma-4-31b-it:free",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What is in this image? Respond in 1 word." },
        { type: "image_url", image_url: { url: testImage } }
      ]
    }
  ]
});

const options = {
  hostname: 'openrouter.ai',
  path: '/api/v1/chat/completions',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'StyleMind Test'
  }
};

console.log("Testing Vision call to google/gemma-4-31b-it:free...");

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`\n📡 SERVER STATUS: ${res.statusCode}`);
    console.log(`\n💬 RESPONSE: ${data}`);
  });
});

req.on('error', (e) => { console.error("Request failed:", e.message); });
req.write(postData);
req.end();
