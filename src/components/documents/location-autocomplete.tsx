"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";

export type LocationPick = {
  name: string;
  address: string;
};

type Suggestion = LocationPick & { id: string };

interface LocationAutocompleteProps {
  name: string;
  address: string;
  onPick: (value: LocationPick) => void;
  onNameChange: (name: string) => void;
  onAddressChange: (address: string) => void;
  disabled?: boolean;
  namePlaceholder?: string;
  addressPlaceholder?: string;
  nameLabel?: string;
  addressLabel?: string;
}

const inputClass =
  "block w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all";

const labelClass =
  "block text-xs font-semibold text-zinc-400 uppercase tracking-wider";

export function LocationAutocomplete({
  name,
  address,
  onPick,
  onNameChange,
  onAddressChange,
  disabled = false,
  namePlaceholder = "Cari lokasi…",
  addressPlaceholder = "Alamat lengkap",
  nameLabel = "Nama Lokasi",
  addressLabel = "Alamat",
}: LocationAutocompleteProps) {
  const listId = useId();
  const [query, setQuery] = useState(name);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Keep search box in sync when parent resets content.
  useEffect(() => {
    setQuery(name);
  }, [name]);

  useEffect(() => {
    const q = query.trim();
    if (disabled || q.length < 2) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Don't re-search the already-selected name if list is closed.
    const t = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/places/search?q=${encodeURIComponent(q)}`,
          { signal: ac.signal }
        );
        if (!res.ok) {
          throw new Error("Gagal mencari lokasi");
        }
        const data = (await res.json()) as { results?: Suggestion[] };
        setItems(Array.isArray(data.results) ? data.results : []);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setItems([]);
        setError("Pencarian lokasi gagal");
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(t);
      abortRef.current?.abort();
    };
  }, [query, disabled]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(item: Suggestion) {
    onPick({ name: item.name, address: item.address });
    setQuery(item.name);
    setOpen(false);
    setItems([]);
  }

  return (
    <div className="space-y-4" ref={wrapRef}>
      <div className="space-y-1.5">
        <label className={labelClass}>{nameLabel}</label>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              onNameChange(v);
              setOpen(true);
            }}
            onFocus={() => items.length > 0 && setOpen(true)}
            disabled={disabled}
            placeholder={namePlaceholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            className={`${inputClass} pl-10 pr-10`}
          />
          {loading && (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-500" />
          )}
          {open && items.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 py-1 shadow-xl"
            >
              {items.map((item) => (
                <li key={item.id} role="option">
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-zinc-900 focus:bg-zinc-900 focus:outline-none"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(item)}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-zinc-100">
                        {item.name}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">
                        {item.address}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <p className="text-[11px] text-zinc-600">
          Ketik min. 2 huruf, pilih saran, atau isi manual.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>{addressLabel}</label>
        <textarea
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          rows={2}
          disabled={disabled}
          placeholder={addressPlaceholder}
          className="block w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
        />
      </div>
    </div>
  );
}
