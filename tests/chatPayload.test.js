import { describe, it, expect } from "vitest";
import {
  toApiMessages,
  normalizeAIResponse,
  getTrimmedHistory,
  buildPayload,
} from "../src/transform/chatPayload.js";
describe("toApiMessages", () => {
  it("debería convertir role 'character' a 'model'", () => {
    // Arrange
    const messages = [{ role: "character", text: "¡Hmph! Soy Vegeta" }];
    // Act
    const result = toApiMessages(messages);
    // Assert
    expect(result).toEqual([{ role: "model", parts: [{ text: "¡Hmph! Soy Vegeta" }] }]);
  });
  it("debería mantener role 'user' como 'user'", () => {
    const messages = [{ role: "user", text: "Hola Vegeta" }];
    const result = toApiMessages(messages);
    expect(result[0].role).toBe("user");
  });
  it("debería convertir varios mensajes manteniendo el orden", () => {
    const messages = [
      { role: "character", text: "Hola" },
      { role: "user", text: "¿Cómo estás?" },
    ];
    const result = toApiMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("model");
    expect(result[1].role).toBe("user");
  });
});
describe("normalizeAIResponse", () => {
  it("debería extraer el texto de una respuesta válida de Gemini", () => {
    const rawResponse = {
      candidates: [
        { content: { parts: [{ text: "¡Hmph! Habla rápido!" }] } },
      ],
    };
    const result = normalizeAIResponse(rawResponse);
    expect(result).toBe("¡Hmph! Habla rápido!");
  });
  it("debería unir varias parts en un solo string", () => {
    const rawResponse = {
      candidates: [
        { content: { parts: [{ text: "Hola " }, { text: "Vegeta" }] } },
      ],
    };
    expect(normalizeAIResponse(rawResponse)).toBe("Hola Vegeta");
  });
  it("debería retornar string vacío si no hay candidates", () => {
    expect(normalizeAIResponse({})).toBe("");
  });
  it("debería retornar string vacío si la respuesta es null", () => {
    expect(normalizeAIResponse(null)).toBe("");
  });
});
describe("getTrimmedHistory", () => {
  it("debería recortar el historial al máximo de turnos indicado", () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      role: "user",
      text: `mensaje ${i}`,
    }));
    const result = getTrimmedHistory(messages, 5);
    expect(result).toHaveLength(5);
    expect(result[4].text).toBe("mensaje 19"); // se queda con los últimos
  });
  it("debería devolver todo el historial si es menor al máximo", () => {
    const messages = [{ role: "user", text: "hola" }];
    const result = getTrimmedHistory(messages, 12);
    expect(result).toHaveLength(1);
  });
});
describe("buildPayload", () => {
  it("debería armar el payload con el shape correcto para Gemini", () => {
    const payload = buildPayload({
      systemPrompt: "Sos Vegeta, el príncipe de los Saiyajin",
      uiMessages: [{ role: "user", text: "Hola" }],
    });
    expect(payload.systemInstruction).toEqual({ parts: [{ text: "Sos Vegeta, el príncipe de los Saiyajin" }] });
    expect(payload.contents).toEqual([{ role: "user", parts: [{ text: "Hola" }] }]);
    expect(payload.generationConfig).toBeDefined();
  });
});