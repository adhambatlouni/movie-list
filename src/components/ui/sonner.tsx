"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";

export const Toaster = () => (
  <Sonner
    theme="light"
    closeButton
    position="bottom-right"
    style={
      {
        "--normal-bg": "var(--card)",
        "--normal-text": "var(--card-foreground)",
        "--normal-border": "var(--border)",
        "--border-radius": "var(--radius)",
      } as CSSProperties
    }
  />
);
