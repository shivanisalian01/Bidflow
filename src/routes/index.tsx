import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText, Users, BarChart3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BidFlow — Quotations that win business" },
      { name: "description", content: "Elegant quotation and customer management software for modern service businesses. Send professional quotes in minutes." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-display text-lg font-semibold">B</div>
            <span className="font-display text-xl font-semibold tracking-tight">BidFlow</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/auth" className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link to="/auth" search={{ mode: "signup" } as never}>
              <Button size="sm" className="rounded-md">Start free</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-24 pb-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Built for service businesses
          </div>
          <h1 className="mt-6 font-display text-6xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
            Quotations that <em className="italic text-accent">win business.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            BidFlow is the elegant quotation and customer platform for interior
            designers, contractors, agencies, and service teams — turning proposals
            into signed work.
          </p>
          <div className="mt-10 flex items-center gap-3">
            <Link to="/auth" search={{ mode: "signup" } as never}>
              <Button size="lg" className="rounded-md">
                Get started <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="ghost" className="rounded-md">Sign in</Button>
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            { icon: FileText, title: "Quotations", body: "Line items, taxes, discounts, PDFs — professional every time." },
            { icon: Users, title: "Customers", body: "A living record of every relationship, note, and follow-up." },
            { icon: BarChart3, title: "Analytics", body: "Revenue trends, conversion rates, and pipeline health at a glance." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-surface p-8 shadow-elegant">
              <Icon className="h-6 w-6 text-accent" />
              <h3 className="mt-6 font-display text-2xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} BidFlow</div>
          <div className="font-display italic">Made for craft.</div>
        </div>
      </footer>
    </div>
  );
}
