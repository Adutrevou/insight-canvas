import { Link, useParams, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Database,
  Settings2,
  GaugeCircle,
  Sparkles,
  Bell,
  FileText,
  Users,
  Palette,
  ChevronDown,
  LogOut,
  ShieldCheck,
  Building2,
  Wand2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Client } from "@/lib/db-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = (clientId: string) => [
  { to: `/c/${clientId}/overview`, label: "Overview", icon: LayoutDashboard },
  { to: `/c/${clientId}/dashboard-builder`, label: "Dashboard Builder", icon: Sparkles },
  { to: `/c/${clientId}/metrics`, label: "Metrics", icon: GaugeCircle },
  { to: `/c/${clientId}/data-sources`, label: "Data Sources", icon: Database },
  { to: `/c/${clientId}/updates`, label: "Manual Updates", icon: Wand2 },
  { to: `/c/${clientId}/alerts`, label: "Alerts", icon: Bell },
  { to: `/c/${clientId}/reports`, label: "Reports", icon: FileText },
];

const settingsItems = (clientId: string) => [
  { to: `/c/${clientId}/settings/branding`, label: "Branding", icon: Palette },
  { to: `/c/${clientId}/settings/users`, label: "Users", icon: Users },
];

const BRAND_VARS = ["--brand-accent", "--primary", "--ring", "--sidebar-primary", "--sidebar-ring",
  "--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"] as const;

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function applyBrandTheme(brand: string | null | undefined) {
  const root = document.documentElement;
  if (!brand) {
    BRAND_VARS.forEach((v) => root.style.removeProperty(v));
    return;
  }
  const hsl = hexToHsl(brand);
  if (!hsl) return;
  const { h, s } = hsl;
  // Use brand color as-is for accents; derive a 5-color chart palette by rotating hue.
  root.style.setProperty("--brand-accent", brand);
  const primary = `hsl(${h} ${Math.min(85, s)}% 50%)`;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--sidebar-primary", primary);
  root.style.setProperty("--sidebar-ring", primary);
  const offsets = [0, 40, -40, 80, -80];
  offsets.forEach((off, i) => {
    const hue = (h + off + 360) % 360;
    root.style.setProperty(`--chart-${i + 1}`, `hsl(${hue} ${Math.min(80, Math.max(45, s))}% ${50 - i * 4}%)`);
  });
}

export function AppShell({ children }: { children: ReactNode }) {
  const params = useParams({ strict: false }) as { clientId?: string };
  const clientId = params.clientId!;
  const { user, isSuperAdmin, signOut } = useAuth();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!clientId) return;
    supabase.from("clients").select("*").eq("id", clientId).maybeSingle().then(({ data }) => {
      setClient(data as Client | null);
      applyBrandTheme(data?.brand_color);
    });
    if (user) {
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("user_id", user.id)
        .eq("read", false)
        .then(({ count }) => setUnread(count ?? 0));
    }
    return () => applyBrandTheme(null); // restore defaults on unmount/switch
  }, [clientId, user]);

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="w-60 shrink-0 border-r bg-sidebar">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          {client?.logo_url ? (
            <img src={client.logo_url} alt={client.name} className="h-7 w-7 rounded object-cover" />
          ) : (
            <div
              className="flex h-7 w-7 items-center justify-center rounded text-xs font-bold text-white"
              style={{ background: client?.brand_color ?? "#6366f1" }}
            >
              {client?.name?.[0]?.toUpperCase() ?? "•"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{client?.dashboard_name || client?.name || "Dashboard"}</div>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {navItems(clientId).map((item) => (
            <NavLink key={item.to} to={item.to} icon={item.icon} label={item.label} />
          ))}
          <div className="mt-4 px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Settings</div>
          {settingsItems(clientId).map((item) => (
            <NavLink key={item.to} to={item.to} icon={item.icon} label={item.label} />
          ))}
          {isSuperAdmin && (
            <>
              <div className="mt-4 px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Admin</div>
              <NavLink to="/super-admin/clients" icon={ShieldCheck} label="All Clients" />
            </>
          )}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/select-client">
                <Building2 className="mr-1.5 h-4 w-4" />
                Switch client
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild className="relative">
              <Link to="/c/$clientId/alerts" params={{ clientId }}>
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-white">
                    {unread}
                  </span>
                )}
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <span className="mr-1 max-w-[160px] truncate">{user?.email}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/c/$clientId/onboarding" params={{ clientId }}>
                    <Settings2 className="mr-2 h-4 w-4" /> Setup wizard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ to, icon: Icon, label }: { to: string; icon: typeof LayoutDashboard; label: string }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground data-[status=active]:font-medium",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
