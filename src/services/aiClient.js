import { getCharacterById } from "./prompts.js";
import { buildPayload, normalizeAIResponse, getTrimmedHistory } from "../transform/chatPayload.js";

export async function getCharacterReply(characterId, uiMessages) {
  const character = getCharacterById(characterId);
  if (!character) throw new Error(`Personaje desconocido: ${characterId}`);

  const trimmed = getTrimmedHistory(uiMessages);

  const payload = buildPayload({
    systemPrompt: character.systemPrompt,
    uiMessages: trimmed,
  });

  const rawResponse = await sendToRealApi(payload);

  const text = normalizeAIResponse(rawResponse);

  const usage = rawResponse?.usageMetadata;
  if (usage) {
    console.log(`[Tokens] input: ${usage.promptTokenCount}, output: ${usage.candidatesTokenCount}`);
  }

  return text;
}

async function sendToRealApi(payload) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || "Error al llamar a la API de chat");
    err.status = res.status;
    err.retryAfterSeconds = body.retryAfterSeconds;
    throw err;
  }

  return res.json();
}