import { cn } from "@/shared/lib/utils";
import {
  SETTINGS_DANGER_ZONE_HINT,
  SETTINGS_DANGER_ZONE_LABEL,
} from "../constants";
import { SettingsDeleteAccountItem } from "./settings-delete-account-item";
import { SettingsExportDataItem } from "./settings-export-data-item";
import { SettingsSignOutItem } from "./settings-sign-out-item";

type Props = {
  className?: string;
};

/**
 * Pie de cuenta: acciones habituales apiladas; eliminar cuenta
 * en zona sensible aparte (nunca en la misma fila que cerrar sesión).
 */
export function SettingsAccountActions({ className }: Props) {
  return (
    <footer
      className={cn(
        "mt-6 border-t border-line-soft pt-5 md:mt-8 md:pt-6",
        className,
      )}
    >
      <div className="flex max-w-md flex-col items-stretch gap-2">
        <SettingsExportDataItem className="w-full" />
        <SettingsSignOutItem className="w-full" />
      </div>

      <section
        aria-labelledby="settings-danger-zone"
        className="mt-8 max-w-md border-t border-line-soft pt-5 md:mt-10 md:pt-6"
      >
        <h2
          id="settings-danger-zone"
          className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-faint"
        >
          {SETTINGS_DANGER_ZONE_LABEL}
        </h2>
        <p className="mb-3 text-[12.5px] text-mute-subtle">
          {SETTINGS_DANGER_ZONE_HINT}
        </p>
        <SettingsDeleteAccountItem className="w-full" />
      </section>
    </footer>
  );
}
