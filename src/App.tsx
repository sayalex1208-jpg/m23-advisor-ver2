import { useCallback, useState } from "react";
import { AskScreen } from "./components/AskScreen";
import { FarmScreen, type FarmView } from "./components/FarmScreen";
import { GuideScreen } from "./components/GuideScreen";
import { Welcome } from "./components/Welcome";
import { useAccount } from "./lib/account";
import { exitDemo, isDemo, resetDemo } from "./lib/demo";
import { MonthScreen } from "./components/MonthScreen";
import { useFarm } from "./lib/farm";
import { useInstall, useOnline } from "./lib/pwa";
import { useHarvests } from "./lib/harvests";
import { useSprays } from "./lib/sprays";
import { BookIcon, CalendarIcon, ChatIcon, FarmIcon } from "./components/icons";

type Tab = "month" | "ask" | "guide" | "farm";

const TABS: { id: Tab; km: string; en: string; Icon: typeof ChatIcon }[] = [
  { id: "month", km: "ខែនេះ", en: "This month", Icon: CalendarIcon },
  { id: "ask", km: "សួរ", en: "Ask", Icon: ChatIcon },
  { id: "guide", km: "មគ្គុទ្ទេសក៍", en: "Guide", Icon: BookIcon },
  { id: "farm", km: "ចម្ការខ្ញុំ", en: "My farm", Icon: FarmIcon },
];

export function App() {
  // A link can open a tab directly, e.g. /#guide, or a My farm view: /#journal, /#harvest, /#passport.
  const fromLink = location.hash.slice(1);
  const farmLink = (["journal", "harvest", "passport"] as const).find((v) => v === fromLink);
  const [tab, setTab] = useState<Tab>(() =>
    farmLink ? "farm" : TABS.some((t) => t.id === fromLink) ? (fromLink as Tab) : "month",
  );
  const [farm, updateFarm] = useFarm();
  const [account, setAccount] = useAccount();
  const install = useInstall();
  const online = useOnline();
  // One journal for the whole app: the home screen shows what's due, My farm edits it.
  const sprays = useSprays();
  const harvests = useHarvests(farm.hectares, sprays.logs);
  const [farmView, setFarmView] = useState<FarmView>(farmLink ?? "details");
  const [repeatOf, setRepeatOf] = useState<string | null>(null);
  const clearRepeat = useCallback(() => setRepeatOf(null), []);
  const openJournal = useCallback((logId?: string) => {
    setFarmView("journal");
    setRepeatOf(logId ?? null);
    setTab("farm");
  }, []);
  const [handoff, setHandoff] = useState<string | null>(null);
  const clearHandoff = useCallback(() => setHandoff(null), []);
  const askFromGuide = useCallback((question: string) => {
    setHandoff(question);
    setTab("ask");
  }, []);

  // First open: the welcome screen, with Register or Continue as guest.
  if (account.status === "new") return <Welcome onFinish={setAccount} />;

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col bg-bg pt-[env(safe-area-inset-top)]">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-line bg-surface px-4 py-3">
        <img src="/icons/icon.svg" alt="" className="h-9 w-9 shrink-0" />
        <div className="min-w-0 flex-1 leading-tight">
          <h1 className="km text-[16px] font-semibold">ជំនួយការចន្ទី M23</h1>
          <p className="text-[12px] text-muted">M23 Cashew Advisor</p>
        </div>
        {install.canInstall && (
          <button onClick={install.install} className="km shrink-0 rounded-lg border border-brand px-3 py-1.5 text-[13px] text-brand">
            ដំឡើង · Install
          </button>
        )}
      </header>

      {isDemo() && (
        <div className="flex shrink-0 items-center gap-2 bg-warn px-4 py-1.5 text-[12px] text-white">
          <p className="km min-w-0 flex-1 font-medium">ការបង្ហាញ · Demo with a sample farmer</p>
          <button onClick={resetDemo} className="km shrink-0 rounded-md bg-white/20 px-2.5 py-1">
            ចាប់ផ្ដើមថ្មី · Reset
          </button>
          <button onClick={exitDemo} className="km shrink-0 rounded-md bg-white px-2.5 py-1 text-warn">
            ចេញ · Exit
          </button>
        </div>
      )}
      {!online && (
        <p className="km shrink-0 bg-warn-soft px-4 py-1.5 text-center text-[12px] text-warn">
          គ្មានអ៊ីនធឺណិត — មគ្គុទ្ទេសក៍ ការងារខែនេះ និងចម្លើយពីសៀវភៅ នៅតែប្រើបាន · Offline: the Guide, tasks and book answers still work
        </p>
      )}
      {install.inAppHint && (
        <div className="flex shrink-0 items-start gap-2 border-b border-line bg-brand-soft px-4 py-2 text-[12px]">
          <div className="min-w-0 flex-1">
            {install.inAppHint.ios ? (
              <p>
                <span className="km block">ដើម្បីដំឡើងកម្មវិធី សូមបើកទំព័រនេះក្នុង Safari៖ ចុច ⋯ ឬ ប៊ូតុង Share រួចជ្រើស "Open in Safari"។</span>
                <span className="text-muted">To install, open this page in Safari: tap ⋯ or Share, then "Open in Safari".</span>
              </p>
            ) : (
              <p>
                <span className="km block">ដើម្បីដំឡើងកម្មវិធី សូមបើកទំព័រនេះក្នុង Chrome។</span>
                <span className="text-muted">To install, open this page in Chrome.</span>
              </p>
            )}
            {install.inAppHint.chromeUrl && (
              <a href={install.inAppHint.chromeUrl} className="km mt-1.5 inline-block rounded-lg bg-brand px-3 py-1.5 text-[13px] text-brand-ink">
                បើកក្នុង Chrome · Open in Chrome
              </a>
            )}
          </div>
          <button onClick={install.dismissInAppHint} className="km shrink-0 text-muted underline">
            បិទ
          </button>
        </div>
      )}
      {install.showIosHint && (
        <div className="flex shrink-0 items-start gap-2 border-b border-line bg-brand-soft px-4 py-2 text-[12px]">
          <p className="min-w-0 flex-1">
            <span className="km block">ដាក់កម្មវិធីលើអេក្រង់ដើម៖ ចុច Share រួចជ្រើស "Add to Home Screen"។</span>
            <span className="text-muted">Add to your home screen: tap Share, then "Add to Home Screen".</span>
          </p>
          <button onClick={install.dismissIosHint} className="km shrink-0 text-muted underline">
            បិទ
          </button>
        </div>
      )}

      {/* Every screen stays mounted so the chat and the Guide's place survive tab switches. */}
      <main className="min-h-0 flex-1">
        <div hidden={tab !== "month"} className="h-full">
          <MonthScreen
            farm={farm}
            onEditFarm={() => {
              setFarmView("details");
              setTab("farm");
            }}
            onAsk={askFromGuide}
            upcoming={sprays.upcoming}
            onOpenJournal={openJournal}
          />
        </div>
        <div hidden={tab !== "ask"} className="h-full">
          <AskScreen handoff={handoff} onHandoffUsed={clearHandoff} farm={farm} />
        </div>
        <div hidden={tab !== "guide"} className="h-full">
          <GuideScreen onAsk={askFromGuide} />
        </div>
        <div hidden={tab !== "farm"} className="h-full">
          <FarmScreen
            farm={farm}
            update={updateFarm}
            onDone={() => setTab("month")}
            view={farmView}
            setView={setFarmView}
            sprays={sprays}
            harvests={harvests}
            account={account}
            setAccount={setAccount}
            repeatOf={repeatOf}
            onRepeatHandled={clearRepeat}
          />
        </div>
      </main>

      <nav
        className="grid shrink-0 grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
        aria-label="Main"
      >
        {TABS.map(({ id, km, en, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 ${tab === id ? "text-brand" : "text-muted"}`}
          >
            <span className="relative">
              <Icon size={22} />
              {id === "farm" && sprays.dueCount > 0 && (
                <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-danger" />
              )}
            </span>
            <span className="km text-[12px] font-medium leading-tight">{km}</span>
            <span className="text-[10px] leading-tight">{en}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

