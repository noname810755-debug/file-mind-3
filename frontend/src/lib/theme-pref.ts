import { storage } from "@/src/utils/storage";
import { setColorScheme, type ColorScheme } from "@/src/theme";

export type ThemePref = "system" | ColorScheme;
const KEY = "theme-pref";

export function applyThemePref(pref: ThemePref) {
  setColorScheme(pref === "system" ? null : pref);
}

export async function loadThemePref(): Promise<ThemePref> {
  const v = await storage.getItem<ThemePref>(KEY, "system");
  return (v as ThemePref) || "system";
}

export async function saveThemePref(pref: ThemePref) {
  await storage.setItem(KEY, pref);
  applyThemePref(pref);
}
