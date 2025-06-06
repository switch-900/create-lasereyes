"use client";
import React, { ReactNode } from "react";
import { LaserEyesProvider } from "@omnisat/lasereyes";
import { ThemeProvider as NextThemesProvider } from "next-themes";
export default function DefaultLayout({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LaserEyesProvider config={{ network: 'mainnet' }}>
        {children}
      </LaserEyesProvider>
    </NextThemesProvider>
  );
}
