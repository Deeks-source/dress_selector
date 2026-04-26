const https = require('https');
const fs = require('fs');
const path = require('path');

// Manually read .env to avoid 'dotenv' dependency
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/VITE_OPENROUTER_API_KEY="?([^"\n\r]+)"?/);
const API_KEY = match ? match[1] : null;

if (!API_KEY) {
    console.error("❌ API KEY NOT FOUND IN .env");
    process.exit(1);
}

const options = {
    hostname: 'openrouter.ai',
    path: '/api/v1/models',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${API_KEY}`
    }
};

console.log("Checking OpenRouter for available free models...");

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const freeModels = json.data
                .filter(m => m.id.endsWith(':free'))
                .map(m => m.id);
            
            console.log("\n✅ AVAILABLE FREE MODELS FOUND:");
            console.log(freeModels.sort().join('\n'));
            
            const gemmaModel = freeModels.find(m => m.toLowerCase().includes('gemma'));
            if (gemmaModel) {
                console.log(`\n✨ RECOMMENDED GEMMA: "${gemmaModel}"`);
            } else {
                console.log("\n❌ NO GEMMA FREE MODELS FOUND.");
            }
        } catch (e) {
            console.error("Failed to parse response:", e.message);
        }
    });
});

req.on('error', (e) => {
    console.error("Connection failed:", e.message);
});

req.end();
