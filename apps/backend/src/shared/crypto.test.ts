import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "./crypto.js";

describe("token encryption", () => {
  it("round-trips plaintext through encrypt/decrypt", () => {
    const plaintext = "1//0gExampleRefreshTokenValue";
    const ciphertext = encryptToken(plaintext);
    expect(ciphertext).not.toContain(plaintext);
    expect(decryptToken(ciphertext)).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const plaintext = "same-value";
    expect(encryptToken(plaintext)).not.toBe(encryptToken(plaintext));
  });

  it("throws when ciphertext is tampered with", () => {
    const ciphertext = encryptToken("secret");
    const [iv, authTag, data] = ciphertext.split(".");
    const tampered = [iv, authTag, `${data!.slice(0, -2)}AA`].join(".");
    expect(() => decryptToken(tampered)).toThrow();
  });
});
