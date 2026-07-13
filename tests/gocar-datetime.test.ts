import { describe, expect, it } from "vitest";
import {
  durationMinutesBetween,
  formatDurationMinutes,
  formatOrderDate,
  formatTripDateTime,
  parseOrderDateDisplay,
  parseTripDateTimeDisplay,
} from "@/modules/documents/gocar-datetime";

describe("gocar datetime helpers", () => {
  it("formats order date like the default receipt", () => {
    expect(formatOrderDate("2026-06-11")).toBe("Kamis, 11 Juni 2026");
  });

  it("formats trip datetime like the default receipt", () => {
    expect(formatTripDateTime("2026-06-11", "15:25")).toBe(
      "11 Juni 2026 jam 15:25"
    );
    expect(formatTripDateTime("2026-06-11", "15:57")).toBe(
      "11 Juni 2026 jam 15:57"
    );
  });

  it("round-trips display strings", () => {
    expect(parseOrderDateDisplay("Kamis, 11 Juni 2026")).toBe("2026-06-11");
    expect(parseTripDateTimeDisplay("11 Juni 2026 jam 15:25")).toEqual({
      date: "2026-06-11",
      time: "15:25",
    });
  });

  it("computes duration between pickup and dropoff", () => {
    const mins = durationMinutesBetween(
      "11 Juni 2026 jam 15:25",
      "11 Juni 2026 jam 15:57"
    );
    expect(mins).toBe(32);
    expect(formatDurationMinutes(mins!)).toBe("32 menit");
  });

  it("returns null for free-text / invalid values", () => {
    expect(formatOrderDate("not-a-date")).toBeNull();
    expect(parseOrderDateDisplay("besok")).toBeNull();
    expect(parseTripDateTimeDisplay("siang")).toBeNull();
  });
});
