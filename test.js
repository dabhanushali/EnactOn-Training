import Groq from "groq-sdk";
import dotenv from 'dotenv';

// Securely loads your API key from a .env file
dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY 
});

async function main() {
  if (!process.env.GROQ_API_KEY) {
    console.error("❌ ERROR: GROQ_API_KEY was not found in your .env file.");
    return;
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: "Hello, can you explain what microservices are in simple terms?",
        },
      ],
      
      // --- USING THE MODEL THAT YOU FOUND WORKS ---
      model: "openai/gpt-oss-20b", 
      
      // Giving it enough tokens to finish its thought
      max_tokens: 1024, 
      
      temperature: 0.7, 
    });

    console.log("✅ API Call Successful with model openai/gpt-oss-20b!");
    console.log("--------------------------------------------------");
    
    // This will print ONLY the clean text from the AI
    console.log(completion.choices[0].message.content);

  } catch (error) {
    console.error("❌ API Call failed:", error.message);
  }
}

main();