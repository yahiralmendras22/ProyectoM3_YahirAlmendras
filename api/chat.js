import { GoogleGenAI } from "@google/genai";

const RETRY_AFTER_FALLBACK_SECONDS = 30;
const MODEL_NAME = "gemini-3.1-flash-lite"; 


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  // Validamos el metodo. Solo aceptamos POST.
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Extrae el payload del body. El cliente nos manda shape de Gemini.
    const { contents, systemInstruction, generationConfig } = req.body ?? {};

    // Validacion minima: contents tiene que ser un array no vacio.
    if (!Array.isArray(contents) || contents.length === 0) {
      return res.status(400).json({ error: "contents required and must be non-empty" });
    }

    // Llamar a Gemini con el SDK nuevo (@google/genai).
    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction,
        ...generationConfig, // maxOutputTokens, temperature
      },
    });

    // Devolvemos el mismo "shape" que ya espera normalizeAIResponse en el front.
    return res.status(200).json({
      candidates: result.candidates,
      usageMetadata: result.usageMetadata,
    });
  } catch (error) {
    // Manejo del 429 (rate limit) preservando el contrato existente.
    if (error?.status === 429 || error?.code === 429) {
      console.warn("Rate limit hit on Gemini");
      return res.status(429).json({
        error: "Rate limit exceeded",
        retryAfterSeconds: RETRY_AFTER_FALLBACK_SECONDS,
      });
    }

    console.error("Error calling Gemini:", error);
    return res.status(500).json({ error: "Error generating response" });
  }
}