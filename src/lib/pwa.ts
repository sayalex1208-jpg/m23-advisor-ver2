// Installing the app to the home screen, and knowing when there's no signal.

import { useEffect, useState } from "react";

// Chrome on Android fires this when the app can be installed. Not in the DOM types yet.
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);

// Links shared on Facebook, Messenger, Instagram, TikTok, LINE or Zalo open in
// that app's own browser, where neither phone can install a web app.
const isInAppBrowser = () =>
  /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|musical_ly|BytedanceWebview|TikTok|\bLine\/|Zalo/i.test(navigator.userAgent);

// Android only: opens this page in Chrome, falling back to the current page if Chrome is missing.
const chromeIntentUrl = () => {
  const { host, pathname, search, hash, href } = window.location;
  return `intent://${host}${pathname}${search}${hash}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
};

function useDismissed(key: string) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(key, "1");
    } catch {
      // Shown again next visit; harmless.
    }
  };
  return [dismissed, dismiss] as const;
}

export function useInstall() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(standalone);
  const [iosHintDismissed, dismissIosHint] = useDismissed("m23.iosHint");
  const [inAppHintDismissed, dismissInAppHint] = useDismissed("m23.inAppHint");
  const inApp = isInAppBrowser();

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return {
    canInstall: !installed && prompt !== null,
    install: async () => {
      if (!prompt) return;
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
    },
    // iPhone has no install prompt: farmers use Share → Add to Home Screen.
    // Share → Add to Home Screen doesn't exist inside Facebook's browser, so that case gets the in-app hint instead.
    showIosHint: !installed && isIos() && !inApp && !iosHintDismissed,
    dismissIosHint,
    // Inside Facebook, Messenger etc.: tell the farmer to open the page in Chrome or Safari first.
    inAppHint: !installed && inApp && !inAppHintDismissed ? { ios: isIos(), chromeUrl: isAndroid() ? chromeIntentUrl() : null } : null,
    dismissInAppHint,
  };
}

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}
