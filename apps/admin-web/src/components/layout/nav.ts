import {
  LayoutDashboard,
  Factory,
  Users,
  FileText,
  ClipboardCheck,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Plants", href: "/plants", icon: Factory },
  { label: "Users", href: "/users", icon: Users },
  { label: "Forms", href: "/forms", icon: FileText },
  { label: "Submissions", href: "/submissions", icon: ClipboardCheck },
];