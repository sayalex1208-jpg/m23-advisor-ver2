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

export type RegisterResult =
  | { ok: true; phone: string; linkingCode: string | null }
  | { ok: false; code: "bad_phone" | "offline" | "unavailable" };

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
  if (res.ok) return { ok: true, phone: data.phone, linkingCode: data.linking_code ?? null };
  return { ok: false, code: res.status === 400 ? "bad_phone" : "unavailable" };
}

export type LinkResult = { ok: true } | { ok: false; code: LinkErrorCode };

export type LinkErrorCode =
  | "bad_code"
  | "not_found"
  | "expired"
  | "self"
  | "conflict"
  | "not_registered"
  | "offline"
  | "unavailable";

/**
 * Link this phone's registration to the farmer's Telegram account, using the
 * 4-digit code the bot showed them. Works either way round: the code may come
 * from the bot, or the code on screen may already be theirs.
 */
export async function linkTelegram(phone: string, code: string): Promise<LinkResult> {
  let res: Response;
  try {
    res = await fetch("/api/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
  } catch {
    return { ok: false, code: "offline" };
  }
  const data = await res.json().catch(() => null);
  if (res.ok) return { ok: true };
  const code2 = (data?.error?.code ?? "unavailable") as LinkErrorCode;
  return { ok: false, code: code2 };
}
