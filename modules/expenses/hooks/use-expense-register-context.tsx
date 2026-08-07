"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import type { ExpenseRegisterOpenOptions } from "../types";

type ExpenseRegisterContextValue = {
  open: (options?: ExpenseRegisterOpenOptions) => void;
  close: () => void;
  isOpen: boolean;
  /** Increments on each `open()` so consumers can remount fresh session state. */
  openNonce: number;
  options: ExpenseRegisterOpenOptions;
};

const ExpenseRegisterContext =
  createContext<ExpenseRegisterContextValue | null>(null);

export function ExpenseRegisterContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openNonce, setOpenNonce] = useState(0);
  const [options, setOptions] = useState<ExpenseRegisterOpenOptions>({
    variant: "fab",
  });

  function open(nextOptions?: ExpenseRegisterOpenOptions) {
    setOptions(nextOptions ?? { variant: "fab" });
    setOpenNonce((nonce) => nonce + 1);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
  }

  const value = { open, close, isOpen, openNonce, options };

  return (
    <ExpenseRegisterContext.Provider value={value}>
      {children}
    </ExpenseRegisterContext.Provider>
  );
}

export function useExpenseRegister() {
  const context = useContext(ExpenseRegisterContext);
  if (!context) {
    throw new Error(
      "useExpenseRegister must be used within ExpenseRegisterContextProvider",
    );
  }
  return context;
}
