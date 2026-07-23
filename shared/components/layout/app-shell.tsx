/**
 * AppShell: layout autenticado común a todas las rutas bajo `(app)`.
 *
 * Estructura:
 *   - Header superior con saludo y acciones (tema, perfil, logout).
 *   - Sidebar / Bottom nav según viewport (decidido por el consumer).
 *   - `<main>` con el contenido.
 *
 * Esta pieza es **composicional**: no impone navegación. El consumer decide
 * qué `<Nav>` pasar y qué layout usar (sidebar en desktop, drawer en mobile).
 *
 * Server Component por defecto. No tiene estado.
 */

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export interface AppShellProps {
  header: ReactNode;
  navigation?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AppShell({
  header,
  navigation,
  children,
  className,
}: AppShellProps) {
  return (
    <div className={cn("flex min-h-dvh flex-col bg-background", className)}>
      {header}
      <div className="flex flex-1 flex-col md:flex-row">
        {navigation && (
          <aside className="hidden md:flex md:w-64 md:flex-col md:border-r">
            {navigation}
          </aside>
        )}
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      {navigation && (
        <nav className="fixed inset-x-0 bottom-0 border-t bg-background md:hidden">
          {navigation}
        </nav>
      )}
    </div>
  );
}
