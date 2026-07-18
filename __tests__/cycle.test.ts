import { describe, expect, it } from "vitest";
import { formatCycle } from "../modules/onboarding/lib/cycle";

describe("formatCycle", () => {
  it("monthly returns day and month in Spanish", () => {
    const result = formatCycle([15], "monthly");
    expect(result).toMatch(/15 [a-z]+ → 15 [a-z]+/);
  });

  it("monthly crosses month boundary with same day", () => {
    const result = formatCycle([1], "monthly");
    expect(result).toMatch(/1 [a-z]+ → 1 [a-z]+/);
  });

  it("biweekly returns both days joined with y, sorted", () => {
    const result = formatCycle([1, 15], "biweekly");
    expect(result).toBe("1 y 15 jul");
  });

  it("biweekly sorts days ascending", () => {
    const result = formatCycle([30, 15], "biweekly");
    expect(result).toBe("15 y 30 jul");
  });

  it("biweekly with only one payday falls back to monthly", () => {
    const result = formatCycle([15], "biweekly");
    expect(result).toMatch(/15 [a-z]+ → 15 [a-z]+/);
  });

  it("monthly and biweekly use short month names", () => {
    expect(formatCycle([1], "monthly")).toMatch(
      /ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic/,
    );
    expect(formatCycle([1, 15], "biweekly")).toMatch(
      /ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic/,
    );
  });
});
