"use client";

import Analytics from "@/components/analytics";
import { useAppContext } from "@/contexts/app";
import { cacheGet } from "@/lib/cache";
import { CacheKey } from "@/services/constant";
import SignModal from "@/components/sign/modal";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";
import { useEffect } from "react";

const DEFAULT_THEME = process.env.NEXT_PUBLIC_DEFAULT_THEME === "dark" ? "dark" : "light";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const { theme, setTheme } = useAppContext();

  useEffect(() => {
    const themeInCache = cacheGet(CacheKey.Theme);
    if (themeInCache && ["dark", "light"].includes(themeInCache)) {
      setTheme(themeInCache);
      return;
    }

    setTheme(DEFAULT_THEME);
  }, [setTheme]);

  return (
    <NextThemesProvider
      forcedTheme={theme || DEFAULT_THEME}
      enableSystem={false}
      {...props}
    >
      {children}

      <Toaster position="top-center" richColors />
      <SignModal />
      <Analytics />
    </NextThemesProvider>
  );
}
