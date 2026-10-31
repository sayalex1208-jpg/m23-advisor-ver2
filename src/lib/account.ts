// Whether this phone has passed the welcome screen, as a guest or by
// registering. Kept on the phone like everything else.

import { useEffect, useState } from "react";

export type Account =
  | { status: "new" }
  | { status: "guest" }
  | { status: "registered"; name: string; phone: string; village: string; at: string };

const KEY = "m23.account";

export function useAccount() {
  const [account, setAccount] = useState<Account>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "null") ?? { status: "new" };
    } catch {
      return { status: "new" };
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(account));
    } catch {
      // The welcome screen shows again next visit; harmless.
    }
  }, [account]);
  return [account, setAccount] as const;
}

export type RegisterResult = { ok: true; phone: string } | { ok: false; code: "bad_phone" | "offline" | "unavailable" };

export async function register(name: string, phone: string, village: string): Promise<RegisterResult> {
  let res: Response;
  try {
    res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, phone, village, consent: true }),
    });
  } catch {
    return { ok: false, code: "offline" };
  }
  const data = await res.json().catch(() => null);
  if (res.ok) return { ok: true, phone: data.phone };
  return { ok: false, code: res.status === 400 ? "bad_phone" : "unavailable" };
}
