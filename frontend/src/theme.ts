// Design tokens for File Mind. Light + Dark themes.
// Keys match the "color" block of design_guidelines.json.
// Brand: #FF5E00 (orange). Use makeStyles() for stylesheets and
// useTheme().colors for color props. Never write color literals in components.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#F5F6F8", // screen canvas
  onSurface: "#1C1C1E",
  surfaceSecondary: "#FFFFFF", // cards, sheets, rows
  onSurfaceSecondary: "#1C1C1E",
  surfaceTertiary: "#EEF0F3", // inputs, chips
  onSurfaceTertiary: "#3A3A3C",
  surfaceInverse: "#1C1C1E", // snackbars/tooltips
  onSurfaceInverse: "#FFFFFF",
  muted: "#8E8E93", // secondary text

  brand: "#FF5E00",
  onBrand: "#FFFFFF",
  brandPrimary: "#FF5E00",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#FFF0E6", // accent tint
  onBrandSecondary: "#FF5E00",
  brandTertiary: "#FFF0E6",
  onBrandTertiary: "#C24800",

  success: "#1B8A3F",
  onSuccess: "#FFFFFF",
  warning: "#B45309",
  onWarning: "#FFFFFF",
  error: "#D32F2F",
  onError: "#FFFFFF",
  info: "#1D4ED8",
  onInfo: "#FFFFFF",

  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  divider: "#ECEDEF",
  overlay: "rgba(0,0,0,0.45)",
};

const dark: typeof light = {
  surface: "#0E0F12",
  onSurface: "#F2F2F7",
  surfaceSecondary: "#1A1C20",
  onSurfaceSecondary: "#F2F2F7",
  surfaceTertiary: "#26282E",
  onSurfaceTertiary: "#D6D6DB",
  surfaceInverse: "#F2F2F7",
  onSurfaceInverse: "#1C1C1E",
  muted: "#9A9AA0",

  brand: "#FF5E00",
  onBrand: "#FFFFFF",
  brandPrimary: "#FF6A17",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#2A1B12",
  onBrandSecondary: "#FF9A5C",
  brandTertiary: "#2A1B12",
  onBrandTertiary: "#FF9A5C",

  success: "#4ADE80",
  onSuccess: "#08210F",
  warning: "#FBBF24",
  onWarning: "#241a03",
  error: "#F87171",
  onError: "#2A0A0A",
  info: "#93C5FD",
  onInfo: "#0A1836",

  border: "#2C2E33",
  borderStrong: "#3A3C42",
  divider: "#24262B",
  overlay: "rgba(0,0,0,0.6)",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light, dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system === "dark" ? "dark" : system === "light" ? "light" : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 };
