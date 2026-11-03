import { useState } from "react";
import { treeAge, type Farm } from "../lib/farm";
import { toKhmerDigits as kh } from "../lib/kb";
import { skyFor, useWeather, type Sky } from "../lib/weather";
import { adviceFor, dayName } from "../lib/weatherAdvice";
import { EntryBody } from "./AnswerParts";
import { AlertIcon, CloudIcon, FogIcon, LeafIcon, PinIcon, RainIcon, RefreshIcon, StormIcon, SunIcon } from "./icons";

const SKY_ICONS: Record<Sky, typeof SunIcon> = { clear: SunIcon, cloudy: CloudIcon, fog: FogIcon, rain: RainIcon, storm: StormIcon };

export function WeatherCard({
  farm,
  month,
  onEditFarm,
  onAsk,
}: {
  farm: Farm;
  month: number;
  onEditFarm: () => void;
  onAsk: (question: string) => void;
}) {
  const { forecast, state, refresh } = useWeather(farm.location);
  const [openId, setOpenId] = useState<string | null>(null);

  if (!farm.location) {
    return (
      <button
        onClick={onEditFarm}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-dashed border-line bg-surface px-4 py-3.5 text-left"
      >
        <SunIcon size={26} className="shrink-0 text-warn" />
        <span className="min-w-0 flex-1">
          <span className="km block text-[15px] font-medium">បន្ថែមទីតាំងចម្ការ ដើម្បីមើលអាកាសធាតុ</span>
          <span className="block text-[14px] text-muted">Add your farm location to see weather warnings for cashew</span>
        </span>
        <PinIcon size={20} className="shrink-0 text-brand" />
      </button>
    );
  }

  if (!forecast) {
    return (
      <div className="mt-3 rounded-2xl border border-line bg-surface px-4 py-4 text-[15px] text-muted">
        {state === "error" ? (
          <div className="flex items-center justify-between gap-3">
            <span>
              <span className="km block">ទាញយកអាកាសធាតុមិនបាន។ ពិនិត្យអ៊ីនធឺណិត។</span>
              <span className="text-[14px]">Couldn't load the weather. Check your connection.</span>
            </span>
            <button onClick={refresh} className="km shrink-0 rounded-lg border border-brand px-3 py-1.5 text-brand">
              សាកម្ដងទៀត
            </button>
          </div>
        ) : (
          <span className="km">កំពុងទាញយកអាកាសធាតុ… · Loading weather…</span>
        )}
      </div>
    );
  }

  const now = skyFor(forecast.current.code);
  const NowIcon = SKY_ICONS[now.sky];
  const advice = adviceFor(forecast, month, treeAge(farm));
  const updated = new Date(forecast.fetchedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <section className="mt-3 rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-3 px-4 pt-4">
        <NowIcon size={40} className={now.sky === "clear" ? "text-warn" : "text-brand"} />
        <div className="min-w-0 flex-1">
          <p className="km text-[26px] font-semibold leading-none tabular-nums">{kh(Math.round(forecast.current.temp))}°C</p>
          <p className="km mt-1 text-[15px] text-muted">
            {now.km} · សំណើម {kh(forecast.current.humidity)}%
          </p>
          <p className="text-[14px] text-muted">
            {now.en} · humidity {forecast.current.humidity}%
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={state === "loading"}
          className="flex h-12 w-11 shrink-0 items-center justify-center rounded-xl text-muted disabled:animate-spin"
          aria-label="ធ្វើបច្ចុប្បន្នភាព · Refresh weather"
        >
          <RefreshIcon size={18} />
        </button>
      </div>
      <p className="km px-4 pt-1 text-[13px] text-muted">
        {farm.location.label ?? "ទីតាំងចម្ការ GPS"} · Open-Meteo · {kh(updated)}
        {state === "error" && " · ទិន្នន័យចាស់ (offline)"}
      </p>

      <ol className="mt-3 grid grid-cols-5 border-y border-line">
        {forecast.days.map((d, i) => {
          const sky = skyFor(d.code);
          const Icon = SKY_ICONS[sky.sky];
          const name = dayName(d.date, i);
          return (
            <li key={d.date} className="flex flex-col items-center gap-0.5 py-2.5 text-center">
              <span className="km text-[13px] leading-tight text-muted">{i === 0 ? name.km : name.km.replace("ថ្ងៃ", "")}</span>
              <Icon size={20} className={sky.sky === "clear" ? "text-warn" : "text-brand"} />
              <span className="km text-[15px] font-medium tabular-nums">{kh(Math.round(d.max))}°</span>
              <span className="km text-[13px] tabular-nums text-muted">{kh(Math.round(d.min))}°</span>
              <span className="km text-[13px] tabular-nums text-brand">{d.rainChance > 0 ? `${kh(d.rainChance)}%` : "–"}</span>
            </li>
          );
        })}
      </ol>

      <div className="px-4 pb-4 pt-3">
        <p className="text-[14px] font-semibold uppercase tracking-wide text-muted">
          <span className="km normal-case">អាកាសធាតុនេះ មានន័យយ៉ាងណាសម្រាប់ចន្ទី</span> · What it means for your cashew
        </p>
        {advice.length === 0 ? (
          <p className="km mt-2 text-[15px] text-muted">
            គ្មានការព្រមានពីសៀវភៅ សម្រាប់ ៣ ថ្ងៃខាងមុខ។ <span className="text-[14px]">No warnings from the book for the next 3 days.</span>
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {advice.map((a) => {
              const open = openId === a.id;
              return (
                <li key={a.id} className={`rounded-xl ${a.tone === "warn" ? "bg-warn-soft" : "bg-brand-soft"}`}>
                  <button
                    onClick={() => setOpenId(open ? null : a.id)}
                    aria-expanded={open}
                    className="flex w-full gap-2 px-3 py-2.5 text-left"
                  >
                    {a.tone === "warn" ? (
                      <AlertIcon size={17} className="mt-1 shrink-0 text-warn" />
                    ) : (
                      <LeafIcon size={17} className="mt-1 shrink-0 text-brand" />
                    )}
                    <span className="min-w-0">
                      <span className="km block text-[15px]">{a.km}</span>
                      <span className="block text-[14px] text-muted">{a.en}</span>
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-line/60 bg-surface px-3 pb-3 pt-3">
                      <EntryBody id={a.entry} onAsk={onAsk} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
