"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { useSpaceSettings } from "../queries";
import { EspaciosLoadingSkeleton } from "./espacios-loading-skeleton";
import { SpaceSettingsDangerSection } from "./space-settings-danger-section";
import { SpaceSettingsMembersSection } from "./space-settings-members-section";
import { SpaceSettingsStatusSection } from "./space-settings-status-section";

type Props = {
  spaceId: Id<"financialSpaces">;
};

/** Miembros, estado y zona sensible — listas para componer en la vista de ajustes. */
export function SpaceSettingsOperationalSections({ spaceId }: Props) {
  const settings = useSpaceSettings(spaceId);

  if (settings === undefined) {
    return <EspaciosLoadingSkeleton />;
  }

  if (settings === null) {
    return (
      <p className="text-sm text-mute">
        No pudimos cargar la configuración de este espacio.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <SpaceSettingsMembersSection spaceId={spaceId} settings={settings} />
      <SpaceSettingsStatusSection spaceId={spaceId} settings={settings} />
      <SpaceSettingsDangerSection spaceId={spaceId} settings={settings} />
    </div>
  );
}
