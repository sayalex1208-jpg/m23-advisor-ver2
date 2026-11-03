import { useState } from "react";
import { toKhmerDigits as kh } from "../lib/kb";
import { PROVINCES, type FarmLocation } from "../lib/weather";
import { PinIcon } from "./icons";

type GpsState = "idle" | "locating" | "denied" | "failed" | "unsupported";

const GPS_MESSAGES: Record<Exclude<GpsState, "idle" | "locating">, { km: string; en: string }> = {
  denied: {
    km: "ទូរស័ព្ទមិនអនុញ្ញាតឲ្យប្រើទីតាំងទេ។ បើកការអនុញ្ញាតទីតាំងសម្រាប់គេហទំព័រនេះ ឬជ្រើសខេត្តខាងក្រោម។",
    en: "Location permission was refused. Allow location for this site in your browser settings, or pick your province below.",
  },
  failed: {
    km: "រកទីតាំងមិនឃើញ។ សូមចេញទៅទីវាល ហើយសាកម្ដងទៀត ឬជ្រើសខេត្ត។",
    en: "Couldn't find your location. Step outside into the open and try again, or pick your province.",
  },
  unsupported: {
    km: "ទូរស័ព្ទនេះមិនអាចប្រាប់ទីតាំងបានទេ។ សូមជ្រើសខេត្ត។",
    en: "This phone can't share its location. Please pick your province.",
  },
};

export function LocationField({
  location,
  onChange,
}: {
  location: FarmLocation | null;
  onChange: (l: FarmLocation | null) => void;
}) {
  const [gps, setGps] = useState<GpsState>("idle");

  function useGps() {
    if (!("geolocation" in navigator)) return setGps("unsupported");
    setGps("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          label: null,
          capturedAt: new Date().toISOString(),
        });
        setGps("idle");
      },
      (err) => setGps(err.code === err.PERMISSION_DENIED ? "denied" : "failed"),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  return (
    <div>
      {location && (
        <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-brand bg-brand-soft px-3.5 py-3">
          <PinIcon size={20} className="mt-0.5 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            {location.label ? (
              <p className="km text-[15px] font-medium">{location.label}</p>
            ) : (
              <>
                <p className="km text-[15px] font-medium">ទីតាំងចម្ការ (GPS)</p>
                <p className="text-[15px] tabular-nums text-muted">
                  {location.lat.toFixed(5)}, {location.lon.toFixed(5)}
                  {location.accuracy !== null && <span className="km"> · ±{kh(location.accuracy)} ម</span>}
                </p>
              </>
            )}
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
              <a
                href={`https://www.google.com/maps?q=${location.lat},${location.lon}`}
                target="_blank"
                rel="noreferrer"
                className="text-brand underline"
              >
                <span className="km">មើលលើផែនទី</span> · Map
              </a>
              <button onClick={() => onChange(null)} className="text-muted underline">
                <span className="km">លុប</span> · Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={useGps}
        disabled={gps === "locating"}
        className="km flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-brand bg-surface text-[15px] text-brand disabled:opacity-60"
      >
        <PinIcon size={18} />
        {gps === "locating"
          ? "កំពុងរកទីតាំង… · Finding location…"
          : location && !location.label
            ? "ចាប់ទីតាំងម្ដងទៀត · Capture again"
            : "ប្រើទីតាំងខ្ញុំ · Use my location"}
      </button>
      <p className="mt-1.5 text-[14px] text-muted">
        <span className="km">ល្អបំផុត ពេលអ្នកកំពុងនៅក្នុងចម្ការ។ </span>Best done while standing in your farm.
      </p>
      {gps !== "idle" && gps !== "locating" && (
        <p className="mt-2 rounded-lg bg-warn-soft px-2.5 py-2 text-[15px] text-warn">
          <span className="km block">{GPS_MESSAGES[gps].km}</span>
          <span className="block opacity-85">{GPS_MESSAGES[gps].en}</span>
        </p>
      )}

      <p className="mb-2 mt-4 text-[15px] text-muted">
        <span className="km">ឬជ្រើសខេត្ត</span> · Or pick your province
      </p>
      <div className="flex flex-wrap gap-2">
        {PROVINCES.map((p) => {
          const selected = location?.label === p.km;
          return (
            <button
              key={p.en}
              onClick={() =>
                onChange({ lat: p.lat, lon: p.lon, accuracy: null, label: p.km, capturedAt: new Date().toISOString() })
              }
              aria-pressed={selected}
              className={`km flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[15px] transition-colors ${
                selected ? "border-brand bg-brand font-medium text-brand-ink" : "border-line bg-surface active:bg-brand-soft"
              }`}
            >
              {selected && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7" />
                </svg>
              )}
              {p.km}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[14px] text-muted">
        <span className="km">ទីតាំងពិតប្រាកដរក្សាទុកតែក្នុងទូរស័ព្ទនេះ។ សេវាអាកាសធាតុ (Open-Meteo) ទទួលបានតែទីតាំងប្រហាក់ប្រហែល (ប្រហែល ១ គ.ម)។ </span>
        Your exact location stays on this phone. The weather service (Open-Meteo) only gets it rounded to about 1 km.
      </p>
    </div>
  );
}
