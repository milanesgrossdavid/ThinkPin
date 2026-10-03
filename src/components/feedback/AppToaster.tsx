"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Toaster, sileo } from "sileo";

type AppToast = {
  success: (title: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string) => void;
  action: (title: string, buttonTitle: string, onClick: () => void) => void;
};

const AppToastContext = createContext<AppToast | null>(null);

export function useAppToast() {
  const toast = useContext(AppToastContext);
  if (!toast) {
    throw new Error("useAppToast must be used within AppToaster.");
  }
  return toast;
}

export function AppToaster({ children }: { children: ReactNode }) {
  const toast = useMemo<AppToast>(
    () => ({
      success: (title) => sileo.success({ title }),
      error: (title, description) => sileo.error({ title, description }),
      info: (title) => sileo.info({ title }),
      action: (title, buttonTitle, onClick) =>
        sileo.action({
          title,
          duration: 8000,
          button: { title: buttonTitle, onClick },
        }),
    }),
    [],
  );

  return (
    <AppToastContext.Provider value={toast}>
      {children}
      <Toaster position="bottom-right" theme="system" />
    </AppToastContext.Provider>
  );
}
