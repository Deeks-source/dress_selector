const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/VITE_OPENROUTER_API_KEY="?([^"\n\r]+)"?/);
const API_KEY = match ? match[1] : null;

const options = {
    hostname: 'openrouter.ai',
    path: '/api/v1/models',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${API_KEY}` }
};

https.get(options, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
        const json = JSON.parse(data);
        const free = json.data
            .filter(m => m.id.endsWith(':free'))
            .map(m => m.id);
        console.log(free.sort().join('\n'));
    });
});
