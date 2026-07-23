"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/auth/auth-client";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  SETTINGS_DELETE_ACCOUNT,
  SETTINGS_DELETE_ACCOUNT_BODY,
  SETTINGS_DELETE_ACCOUNT_CANCEL,
  SETTINGS_DELETE_ACCOUNT_CONFIRM,
  SETTINGS_DELETE_ACCOUNT_ERROR,
  SETTINGS_DELETE_ACCOUNT_TITLE,
  SETTINGS_DELETE_ACCOUNT_WORKING,
} from "../constants";

type Props = {
  className?: string;
};

/**
 * D3 — "Eliminar cuenta". Modal destructivo del canon §3.6.5: border-top
 * terracota, salida siempre visible ("No, volver") y acción destructiva
 * deliberada. El borrado en cascada lo ejecuta el trigger onDelete del
 * backend (convex/auth.ts → profiles.deleteAllDataForProfile).
 */
export function SettingsDeleteAccountItem({ className }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    setHasError(false);
    const result = await authClient.deleteUser();
    if (result.error) {
      setHasError(true);
      setIsDeleting(false);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full rounded-[14px] border border-danger-line bg-card px-4 py-3.5 text-left text-[13.5px] font-medium text-danger-ink transition-colors hover:bg-danger-bg",
          className,
        )}
      >
        {SETTINGS_DELETE_ACCOUNT}
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="rounded-[22px] border-t-4 border-t-danger">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">
              {SETTINGS_DELETE_ACCOUNT_TITLE}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {SETTINGS_DELETE_ACCOUNT_BODY}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {hasError ? (
            <p
              className="text-center text-[12.5px] text-danger-ink"
              role="alert"
            >
              {SETTINGS_DELETE_ACCOUNT_ERROR}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {SETTINGS_DELETE_ACCOUNT_CANCEL}
            </AlertDialogCancel>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-danger text-canvas hover:bg-danger/90"
            >
              {isDeleting
                ? SETTINGS_DELETE_ACCOUNT_WORKING
                : SETTINGS_DELETE_ACCOUNT_CONFIRM}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
