"use client";

import { useState } from "react";
import { limaDateToInputValue } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import {
  SETTINGS_EXPORT_DATA,
  SETTINGS_EXPORT_DATA_ERROR,
  SETTINGS_EXPORT_DATA_PREPARING,
} from "../constants";
import { useExportMyData } from "../queries";
import { SettingsAccountActionButton } from "./settings-account-action-button";

type Props = {
  className?: string;
};

/** D3 — portabilidad (Ley 29733): descarga JSON con todos los datos del usuario. */
export function SettingsExportDataItem({ className }: Props) {
  const fetchExport = useExportMyData();
  const [isExporting, setIsExporting] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setHasError(false);
    try {
      const data = await fetchExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `quipu-mis-datos-${limaDateToInputValue(Date.now())}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setHasError(true);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <span className={cn("flex max-w-full flex-col items-stretch", className)}>
      <SettingsAccountActionButton
        tone="neutral"
        className="w-full"
        onClick={handleExport}
        disabled={isExporting}
      >
        {isExporting ? SETTINGS_EXPORT_DATA_PREPARING : SETTINGS_EXPORT_DATA}
      </SettingsAccountActionButton>
      {hasError ? (
        <p className="mt-1 px-3 text-[12px] text-danger-ink" role="alert">
          {SETTINGS_EXPORT_DATA_ERROR}
        </p>
      ) : null}
    </span>
  );
}
