/**
 * Nav: navegación principal de la app.
 *
 * Server Component. Los items se pasan como props para mantener el control
 * de qué rutas existen en cada módulo.
 *
 * El estado activo se detecta comparando el pathname actual. Como este
 * componente se renderiza en servidor, necesita recibir el pathname desde
 * arriba (layout) o usar un componente cliente para tracking.
 *
 * Por ahora, este es un **esqueleto de presentación**. El tracking de
 * ruta activa se agrega cuando se cree el header de la app.
 */

import Link from "next/link";
import { cn } from "@/shared/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  /** Si está activo, normalmente lo decide el padre con `usePathname`. */
  active?: boolean;
}

export interface NavProps {
  items: NavItem[];
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function Nav({ items, className, orientation = "vertical" }: NavProps) {
  return (
    <ul
      className={cn(
        "flex gap-1",
        orientation === "vertical"
          ? "flex-col p-2"
          : "flex-row items-center justify-around p-1",
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.href} className="flex-1">
          <Link
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              item.active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground",
              orientation === "horizontal" && "flex-col gap-1 text-xs",
            )}
            aria-current={item.active ? "page" : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
