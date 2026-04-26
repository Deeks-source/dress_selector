import os
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=os.getenv("OPENROUTER_API_KEY", "YOUR_KEY_HERE"),
)

# # First API call with reasoning
# response = client.chat.completions.create(
#   model="google/gemma-3-27b-it:free",
#   messages=[
#           {
#             "role": "user",
#             "content": "How many r's are in the word 'strawberry'?"
#           }
#         ],
#   extra_body={"reasoning": {"enabled": True}}
# )

# # Extract the assistant message with reasoning_details
# response = response.choices[0].message

# # Preserve the assistant message with reasoning_details
# messages = [
#   {"role": "user", "content": "How many r's are in the word 'strawberry'?"},
#   {
#     "role": "assistant",
#     "content": response.content,
#     "reasoning_details": response.reasoning_details  # Pass back unmodified
#   },
#   {"role": "user", "content": "Are you sure? Think carefully."}
# ]

# # Second API call - model continues reasoning from where it left off
# response2 = client.chat.completions.create(
#   model="google/gemma-4-31b-it:free",
#   messages=messages,
#   extra_body={"reasoning": {"enabled": True}}
# )

# Image input embeddings use multimodal content format
embedding = client.embeddings.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>", # Optional. Site URL for rankings on openrouter.ai.
    "X-OpenRouter-Title": "<YOUR_SITE_NAME>", # Optional. Site title for rankings on openrouter.ai.
  },
  model="nvidia/llama-nemotron-embed-vl-1b-v2:free",
  input=[
    {
      "content": [
        {"type": "text", "text": "What is in this image?"},
        {"type": "image_url", "image_url": {"url": "https://live.staticflickr.com/3851/14825276609_098cac593d_b.jpg"}}
      ]
    }
  ],
  encoding_format="float"
)

print(embedding.data[0].embedding[:5])