"use client";

import { cn } from "@/shared/lib/utils";
import {
  SETTINGS_ACCOUNT_ACTIONS_LABEL,
  SETTINGS_DANGER_ZONE_HINT,
  SETTINGS_DANGER_ZONE_LABEL,
} from "../constants";
import { downloadProfileExport } from "../lib/downloadProfileExport";
import { useExportMyData } from "../queries";
import { SettingsDeleteAccountItem } from "./settings-delete-account-item";
import { SettingsExportDataItem } from "./settings-export-data-item";
import { SettingsSignOutItem } from "./settings-sign-out-item";

type Props = {
  className?: string;
};

/**
 * Pie de cuenta: lista alineada al canon (filas en card), no botones apilados.
 * Eliminar cuenta en zona sensible aparte.
 */
export function SettingsAccountActions({ className }: Props) {
  const fetchExport = useExportMyData();

  return (
    <footer className={cn("mt-8 md:mt-10", className)}>
      <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-faint md:text-[10px]">
        {SETTINGS_ACCOUNT_ACTIONS_LABEL}
      </p>

      <div className="rounded-[14px] border border-line bg-card px-4 py-0.5">
        <div className="flex min-h-11 items-center gap-2 border-b border-line-soft py-2.5">
          <SettingsExportDataItem
            onExport={() => downloadProfileExport(fetchExport)}
          />
        </div>
        <SettingsSignOutItem />
      </div>

      <section
        aria-labelledby="settings-danger-zone"
        className="mt-8 border-t border-line-soft pt-6 md:mt-10 md:pt-8"
      >
        <h2
          id="settings-danger-zone"
          className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-faint"
        >
          {SETTINGS_DANGER_ZONE_LABEL}
        </h2>
        <p className="mb-3 max-w-xl text-[12.5px] text-mute-subtle">
          {SETTINGS_DANGER_ZONE_HINT}
        </p>
        <div className="max-w-sm">
          <SettingsDeleteAccountItem className="w-full" />
        </div>
      </section>
    </footer>
  );
}
