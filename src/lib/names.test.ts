import { describe, expect, it } from "vitest";
import { displayName, hasLastName } from "./names";

describe("displayName", () => {
  it("uses first name and last initial", () => {
    expect(displayName("Josh Orr")).toBe("Josh O");
    expect(displayName("  sarah   clausen ")).toBe("sarah C");
    expect(displayName("Mary Ann Smith")).toBe("Mary S");
  });

  it("ignores suffixes", () => {
    expect(displayName("Ron Deiter Jr.")).toBe("Ron D");
  });

  it("adds letters when the short name is taken", () => {
    expect(displayName("Josh Orr", ["Josh O"])).toBe("Josh Or");
    expect(displayName("Josh Uhlman", ["Josh O"])).toBe("Josh U");
  });

  it("knows when a last name is missing", () => {
    expect(hasLastName("Oz")).toBe(false);
    expect(hasLastName("Rich Oswald")).toBe(true);
  });
});
