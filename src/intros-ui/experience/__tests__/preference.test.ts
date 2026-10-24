import { describe, it, expect } from "vitest";
import { readExperience, saveExperience, EXPERIENCE_KEY } from "../preference";

describe("visual preference is independent from appearance and member data", () => {
  it("preserves Business for existing visitors unless Social is explicitly chosen", () => {
    for (const saved of [null, "business", "invalid", "dark", "light"]) {
      expect(readExperience({ getItem: () => saved })).toBe("business");
    }
    expect(readExperience({ getItem: () => "social" })).toBe("social");
  });
  it("writes only the presentation key and restores it", () => {
    const records = new Map([
      ["ask-intros.appearance", "light"],
      ["draft", "Keep my message"],
    ]);
    const storage = {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => {
        records.set(key, value);
      },
    };
    saveExperience(storage, "social");
    expect(readExperience(storage)).toBe("social");
    expect(records.get("ask-intros.appearance")).toBe("light");
    expect(records.get("draft")).toBe("Keep my message");
    expect([...records.keys()]).toEqual(["ask-intros.appearance", "draft", EXPERIENCE_KEY]);
  });
  it("works with blocked storage", () => {
    expect(
      readExperience({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBe("business");
    expect(() =>
      saveExperience(
        {
          setItem: () => {
            throw new Error("blocked");
          },
        },
        "social",
      ),
    ).not.toThrow();
  });
});
