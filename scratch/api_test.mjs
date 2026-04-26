import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.VITE_OPENROUTER_API_KEY;

async function testOpenRouter() {
    console.log("Checking OpenRouter for available free models...");
    try {
        const response = await fetch("https://openrouter.ai/api/v1/models");
        const data = await response.json();
        
        const freeModels = data.data
            .filter(m => m.id.endsWith(':free'))
            .map(m => m.id);
            
        console.log("\n✅ AVAILABLE FREE MODELS FOUND:");
        console.log(freeModels.join('\n'));
        
        const gemmaModel = freeModels.find(m => m.toLowerCase().includes('gemma'));
        if (gemmaModel) {
            console.log(`\n✨ FOUND GEMMA: "${gemmaModel}"`);
        } else {
            console.log("\n❌ NO MODEL WITH 'GEMMA' IN THE NAME IS CURRENTLY FREE.");
        }

    } catch (e) {
        console.error("Connection failed:", e.message);
    }
}

testOpenRouter();
