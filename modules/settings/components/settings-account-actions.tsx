import { cn } from "@/shared/lib/utils";
import { SettingsDeleteAccountItem } from "./settings-delete-account-item";
import { SettingsExportDataItem } from "./settings-export-data-item";
import { SettingsSignOutItem } from "./settings-sign-out-item";

type Props = {
  className?: string;
};

/**
 * Pie de cuenta deliberado: acciones raras en fila (wrap), ancho intrínseco.
 * No son CTAs ni cards a full-bleed — el peso visual queda en el sistema arriba.
 */
export function SettingsAccountActions({ className }: Props) {
  return (
    <footer
      className={cn(
        "mt-6 border-t border-line-soft pt-5 md:mt-8 md:pt-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SettingsExportDataItem />
        <SettingsSignOutItem />
        <SettingsDeleteAccountItem />
      </div>
    </footer>
  );
}
