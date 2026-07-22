export const SIDEBAR_ITEMS: Array<{
  href: string;
  label: string;
  disabled?: boolean;
}> = [
  { href: "/dashboard", label: "Inicio" },
  { href: "#", label: "Registrar", disabled: true },
  { href: "/savings", label: "Ahorros" },
  { href: "/commitments", label: "Compromisos" },
  { href: "/settings", label: "Ajustes" },
];

export const BOTTOM_NAV_ITEMS: Array<{
  href: string;
  label: string;
  disabled?: boolean;
}> = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/savings", label: "Ahorros" },
  { href: "/commitments", label: "Compromisos" },
  { href: "/settings", label: "Ajustes" },
];
