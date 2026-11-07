import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI();

const result = await openai.responses.create({
  model: "gpt-6-luna",
  input: "Reply with exactly: API connection works."
});

console.log(result.output_text);