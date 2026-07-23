"use client";

import { useState } from "react";
import { limaDateToInputValue } from "@/shared/lib/date";
import {
  SETTINGS_EXPORT_DATA,
  SETTINGS_EXPORT_DATA_ERROR,
  SETTINGS_EXPORT_DATA_PREPARING,
} from "../constants";
import { useExportMyData } from "../queries";

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
    <div className={className}>
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        className="w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-left text-[13.5px] font-medium text-ink transition-colors hover:bg-surface-warm disabled:opacity-60"
      >
        {isExporting ? SETTINGS_EXPORT_DATA_PREPARING : SETTINGS_EXPORT_DATA}
      </button>
      {hasError ? (
        <p className="mt-1.5 text-[12px] text-danger-ink" role="alert">
          {SETTINGS_EXPORT_DATA_ERROR}
        </p>
      ) : null}
    </div>
  );
}
