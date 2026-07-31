import { Button } from "@/shared/components/ui/button";

type Props = {
  saving: boolean;
  serverError: string | null;
  onCancel: () => void;
  onSubmit: () => void;
};

export function CycleCorrectActions({
  saving,
  serverError,
  onCancel,
  onSubmit,
}: Props) {
  return (
    <>
      {serverError ? (
        <p className="text-sm text-danger-ink">{serverError}</p>
      ) : null}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={saving}
          onClick={onSubmit}
        >
          {saving ? "Guardando…" : "Aplicar corrección"}
        </Button>
      </div>
    </>
  );
}
