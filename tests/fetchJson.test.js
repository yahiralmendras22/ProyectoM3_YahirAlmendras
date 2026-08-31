import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchJson } from "../src/services/fetchJson.js";

describe("fetchJson", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("debería devolver el JSON parseado cuando la respuesta es ok", async () => {
        // Arrange
        const mockData = { hello: "world" };
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockData),
        });

        // Act
        const result = await fetchJson("https://example.com/api");

        // Assert
        expect(global.fetch).toHaveBeenCalledWith("https://example.com/api");
        expect(result).toEqual(mockData);
    });

    it("debería lanzar un error con el status cuando la respuesta no es ok", async () => {
        // Arrange
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            statusText: "Not Found",
        });

        // Act & Assert
        await expect(fetchJson("https://example.com/api")).rejects.toThrow(
            "HTTP 404: Not Found",
        );
    });
});