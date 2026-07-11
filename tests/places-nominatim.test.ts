import { describe, expect, it, vi } from "vitest";
import {
  mapNominatimResults,
  placeAddressFromResult,
  placeNameFromResult,
  sanitizePlaceQuery,
  searchNominatimPlaces,
  type NominatimResult,
} from "@/modules/places/nominatim";

describe("Nominatim place helpers", () => {
  it("sanitizes and truncates queries", () => {
    expect(sanitizePlaceQuery("  stasiun   gambir  ")).toBe("stasiun gambir");
    expect(sanitizePlaceQuery("x".repeat(200)).length).toBe(120);
  });

  it("prefers explicit name, then address amenity, then first display segment", () => {
    expect(placeNameFromResult({ name: "Stasiun Gambir" })).toBe(
      "Stasiun Gambir"
    );
    expect(
      placeNameFromResult({
        display_name: "Something, Jakarta",
        address: { amenity: "Stasiun Gambir" },
      })
    ).toBe("Stasiun Gambir");
    expect(
      placeNameFromResult({
        display_name: "Sentral Senayan 1 - 2, Jakarta, Indonesia",
      })
    ).toBe("Sentral Senayan 1 - 2");
  });

  it("maps and dedupes nominatim results", () => {
    const raw: NominatimResult[] = [
      {
        place_id: 1,
        name: "Stasiun Gambir",
        display_name:
          "Stasiun Gambir, Jl. Medan Merdeka Timur, Jakarta Pusat, Indonesia",
      },
      {
        place_id: 2,
        name: "Stasiun Gambir",
        display_name:
          "Stasiun Gambir, Jl. Medan Merdeka Timur, Jakarta Pusat, Indonesia",
      },
      {
        place_id: 3,
        display_name: "Monas, Jakarta Pusat, Indonesia",
        address: { tourism: "Monumen Nasional" },
      },
    ];
    const mapped = mapNominatimResults(raw);
    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toMatchObject({
      id: "1",
      name: "Stasiun Gambir",
    });
    expect(mapped[1]?.name).toBe("Monumen Nasional");
    expect(placeAddressFromResult(raw[0]!)).toContain("Jakarta Pusat");
  });

  it("search returns empty for short queries and maps fetch payload", async () => {
    expect(await searchNominatimPlaces("a")).toEqual([]);

    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      calls.push(String(input));
      return Response.json([
        {
          place_id: 99,
          name: "Gelora Bung Karno",
          display_name: "Gelora Bung Karno, Jakarta, Indonesia",
        },
      ]);
    };

    const results = await searchNominatimPlaces("gelora", { fetchImpl });
    expect(calls).toHaveLength(1);
    const calledUrl = calls[0] ?? "";
    expect(calledUrl).toContain("nominatim.openstreetmap.org/search");
    expect(calledUrl).toContain("countrycodes=id");
    expect(results[0]).toMatchObject({
      id: "99",
      name: "Gelora Bung Karno",
      address: "Gelora Bung Karno, Jakarta, Indonesia",
    });
  });
});
