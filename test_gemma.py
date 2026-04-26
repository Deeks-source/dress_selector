import google.generativeai as genai

# Your API Key
API_KEY = ""

# Configure the library
genai.configure(api_key=API_KEY)

# Initialize the Gemma 4 31B model
try:
    print("Connecting to Gemma 4 31B...")
    # Note: Ensure the model name matches exactly what Google expects in their SDK
    model = genai.GenerativeModel('gemma-4-31b-it')
    
    response = model.generate_content("Explain how AI works in a few words")
    
    print("\n--- Response ---")
    print(response.text)
    print("\n--- [SUCCESS] Key and Model are working! ---")

except Exception as e:
    print(f"\n--- [ERROR] ---")
    print(e)
