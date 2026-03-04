import {
  Calendar,
  DollarSign,
  Gift,
  LayoutDashboard,
  PiggyBank,
  PlusCircle,
  Settings,
  Trophy,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/core/components/ui/sidebar";
import { NavItems } from "./nav-items";

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  projects: [
    {
      name: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Gastos",
      url: "/expenses",
      icon: DollarSign,
    },
    {
      name: "Ahorro",
      url: "/savings",
      icon: PiggyBank,
    },
    {
      name: "Logros",
      url: "/achievements",
      icon: Trophy,
    },
    {
      name: "Día de pago",
      url: "/payment-day",
      icon: Calendar,
    },
    {
      name: "Ingreso extra",
      url: "/extra-income",
      icon: Gift,
    },
    {
      name: "Registrar gasto",
      url: "/add-expense",
      icon: PlusCircle,
    },
    {
      name: "Configuración",
      url: "/settings",
      icon: Settings,
    },
  ],
};

export default function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>L</SidebarHeader>
      <SidebarContent>
        <NavItems items={data.projects} />
      </SidebarContent>
      <SidebarFooter>FOOTER</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
