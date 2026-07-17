import { createFileRoute, Link, Outlet, useNavigate, useRouterState, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, FileText, BarChart3, Settings, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useBusiness } from "@/lib/business";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Shell,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/quotations", label: "Quotations", icon: FileText },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Shell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: business } = useBusiness();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="no-print hidden w-64 shrink-0 border-r border-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-2 px-6">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-display font-semibold">B</div>
          <span className="font-display text-lg font-semibold tracking-tight">BidFlow</span>
        </div>
        <div className="px-4 py-2">
          <Link to="/quotations/new">
            <Button className="w-full justify-start gap-2" size="sm">
              <Plus className="h-4 w-4" /> New quotation
            </Button>
          </Link>
        </div>
        <nav className="mt-4 flex-1 px-3">
          {nav.map((item) => {
            const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="mb-2 truncate text-xs text-muted-foreground">{business?.name}</div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{email}</div>
            <button onClick={signOut} className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="no-print fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground font-display text-sm font-semibold">B</div>
          <span className="font-display text-base font-semibold">BidFlow</span>
        </Link>
        <button onClick={signOut} className="rounded-md p-1.5 text-muted-foreground">
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <main className="min-w-0 flex-1 pt-14 lg:pt-0">
        <div className="no-print flex overflow-x-auto border-b border-border bg-background lg:hidden">
          {nav.map((n) => {
            const active = pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`shrink-0 px-4 py-2 text-xs font-medium ${active ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>
                {n.label}
              </Link>
            );
          })}
        </div>
        <Outlet />
      </main>
    </div>
  );
}
