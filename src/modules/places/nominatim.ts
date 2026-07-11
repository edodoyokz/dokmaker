/**
 * Nominatim (OpenStreetMap) place search for form location autocomplete.
 * Server-side only — call from API route, never from the browser.
 *
 * Usage policy: identify the app via User-Agent; keep ≤1 req/s.
 */

export type PlaceSuggestion = {
  id: string;
  name: string;
  address: string;
};

export type NominatimResult = {
  place_id?: number | string;
  osm_type?: string;
  osm_id?: number | string;
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "DokMaker/1.0 (gocar-receipt location autocomplete)";

export function sanitizePlaceQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 120);
}

/** Pick a short place name; fall back to the first comma segment of display_name. */
export function placeNameFromResult(result: NominatimResult): string {
  if (result.name?.trim()) return result.name.trim();
  const addr = result.address ?? {};
  for (const key of [
    "amenity",
    "building",
    "shop",
    "tourism",
    "leisure",
    "railway",
    "highway",
    "road",
    "suburb",
    "neighbourhood",
    "village",
    "town",
    "city",
  ]) {
    const v = addr[key];
    if (v?.trim()) return v.trim();
  }
  const display = result.display_name?.trim() ?? "";
  return display.split(",")[0]?.trim() || display;
}

export function placeAddressFromResult(result: NominatimResult): string {
  const address = result.address ?? {};
  const parts = [
    address.road,
    address.house_number,
    address.neighbourhood,
    address.suburb,
    address.village,
    address.city_district,
    address.city,
    address.town,
    address.municipality,
    address.county,
    address.state,
    address.province,
    address.postcode,
    address.country,
  ].filter((part): part is string => Boolean(part?.trim()));

  if (!parts.length) return (result.display_name ?? "").trim();

  const unique = parts.filter(
    (part, index) =>
      parts.findIndex(
        (candidate) => candidate.trim().toLocaleLowerCase("id-ID") === part.trim().toLocaleLowerCase("id-ID")
      ) === index
  );
  const postcode = address.postcode?.trim();
  if (postcode && unique.length > 1) {
    const index = unique.indexOf(postcode);
    if (index > 0) {
      unique[index - 1] = `${unique[index - 1]} ${postcode}`;
      unique.splice(index, 1);
    }
  }
  return unique.map((part) => part.trim()).join(", ");
}

export function mapNominatimResults(
  results: NominatimResult[]
): PlaceSuggestion[] {
  const seen = new Set<string>();
  const out: PlaceSuggestion[] = [];
  for (const r of results) {
    const name = placeNameFromResult(r);
    const address = placeAddressFromResult(r);
    if (!name && !address) continue;
    const id =
      r.place_id != null
        ? String(r.place_id)
        : `${r.osm_type ?? "x"}-${r.osm_id ?? address}`;
    const key = `${name}|${address}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id, name: name || address, address: address || name });
  }
  return out;
}

export async function searchNominatimPlaces(
  query: string,
  opts?: { limit?: number; fetchImpl?: typeof fetch }
): Promise<PlaceSuggestion[]> {
  const q = sanitizePlaceQuery(query);
  if (q.length < 2) return [];

  const limit = Math.min(Math.max(opts?.limit ?? 5, 1), 8);
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrycodes", "id");

  const fetchImpl = opts?.fetchImpl ?? fetch;
  const res = await fetchImpl(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    // Nominatim can be slow; don't hang the form forever.
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    throw new Error(`Nominatim search failed (${res.status})`);
  }

  const data = (await res.json()) as NominatimResult[];
  if (!Array.isArray(data)) return [];
  return mapNominatimResults(data);
}
