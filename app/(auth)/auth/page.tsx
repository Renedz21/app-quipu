import { redirect } from "next/navigation";

/** Ruta legacy del flujo unificado. El canon vive en /sign-in y /sign-up. */
export default function LegacyAuthPage() {
  redirect("/sign-in");
}
