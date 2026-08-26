import { send as sendToMock } from "./mockGeminiApi.js";
import { RICK_SYSTEM_PROMPT } from "./prompts.js";
import { buildPayload, normalizeAIResponse, getTrimmedHistory } from "../transform/chatPayload.js";

export async function getCharacterReply(uiMessages) {
  const trimmed = getTrimmedHistory(uiMessages);

  const payload = buildPayload({
    systemPrompt: RICK_SYSTEM_PROMPT,
    uiMessages: trimmed,
  });

  const rawResponse = await sendToMock(payload);

  const text = normalizeAIResponse(rawResponse);

  const usage = rawResponse?.usageMetadata;
  if (usage) {
    console.log(`[Tokens] input: ${usage.promptTokenCount}, output: ${usage.candidatesTokenCount}`);
  }

  return text;
}