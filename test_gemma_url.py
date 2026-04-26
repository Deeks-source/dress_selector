import json
import urllib.request

# Your API Key
API_KEY = "AIzaSyC8SYovKPIF1Ivw5YTNuEe4FC0W5GHSRXE"
# Correct Model Name from Google Provider
MODEL = "gemma-4-31b-it"
# Direct URL
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

# Data payload
data = {
    "contents": [{
        "parts": [{"text": "Explain how AI works in a few words"}]
    }]
}

# Request Setup
headers = {'Content-Type': 'application/json'}
req = urllib.request.Request(URL, data=json.dumps(data).encode('utf-8'), headers=headers)

try:
    print(f"Calling {MODEL} via direct URL...")
    # Making the call
    with urllib.request.urlopen(req) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        
        # Extracting the response text
        if 'candidates' in res_data:
            text = res_data['candidates'][0]['content']['parts'][0]['text']
            print("\n--- Response ---")
            print(text)
            print("\n--- [SUCCESS] Key and Model are working! ---")
        else:
            print("\n--- [API ERROR] ---")
            print(json.dumps(res_data, indent=2))

except Exception as e:
    print(f"\n--- [CONNECTION ERROR] ---")
    print(e)
