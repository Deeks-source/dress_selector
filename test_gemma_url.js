const API_KEY = process.env.VITE_GEMINI_API_KEY || "YOUR_KEY_HERE";
const MODEL = "gemma-4-31b-it";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const data = {
  contents: [{
    parts: [{ text: "Explain how AI works in a few words" }]
  }]
};

async function testGemma() {
  console.log(`Calling ${MODEL} via direct URL...`);
  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    
    if (result.candidates) {
      console.log("\n--- Response ---");
      console.log(result.candidates[0].content.parts[0].text);
      console.log("\n--- [SUCCESS] Key and Model are working! ---");
    } else {
      console.log("\n--- [API ERROR] ---");
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error("\n--- [CONNECTION ERROR] ---");
    console.error(error);
  }
}

testGemma();
