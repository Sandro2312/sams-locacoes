import { describe, expect, it } from "vitest";

describe("credencial Datajud", () => {
  it("autentica uma consulta leve na API pública do CNJ", async () => {
    const apiKey = String(process.env.DATAJUD_API_KEY || "").trim();
    expect(apiKey).not.toBe("");

    const response = await fetch("https://api-publica.datajud.cnj.jus.br/api_publica_tjrs/_search", {
      method: "POST",
      headers: {
        Authorization: `APIKey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { match_none: {} }, size: 0 }),
    });

    expect(response.status, await response.text()).toBe(200);
  }, 20_000);
});
