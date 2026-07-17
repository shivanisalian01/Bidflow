import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "reset"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — BidFlow" }] }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMode(search.mode ?? "signin"); }, [search.mode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { business_name: businessName || "My Business" },
          },
        });
        if (error) throw error;
        toast.success("Account created. Welcome to BidFlow.");
        navigate({ to: "/dashboard" });
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent. Check your email.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary-foreground text-primary font-display text-lg font-semibold">B</div>
          <span className="font-display text-xl font-semibold">BidFlow</span>
        </Link>
        <div>
          <blockquote className="font-display text-3xl font-medium leading-tight tracking-tight">
            "We replaced three tools with BidFlow. Every quote we send looks like the work we do."
          </blockquote>
          <div className="mt-6 text-sm opacity-70">— Marlow Studio, Interior Design</div>
        </div>
        <div className="text-xs opacity-60">© {new Date().getFullYear()} BidFlow</div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-display font-semibold">B</div>
            <span className="font-display text-xl font-semibold">BidFlow</span>
          </Link>

          <h1 className="font-display text-4xl font-semibold tracking-tight">
            {mode === "signin" && "Welcome back"}
            {mode === "signup" && "Create your workspace"}
            {mode === "reset" && "Reset your password"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" && "Sign in to your BidFlow workspace."}
            {mode === "signup" && "Start sending professional quotations in minutes."}
            {mode === "reset" && "We'll email you a secure link."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="bn">Business name</Label>
                <Input id="bn" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Acme Studio" required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            {mode !== "reset" && (
              <div className="space-y-1.5">
                <Label htmlFor="pw">Password</Label>
                <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
              </div>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signin" && "Sign in"}
              {mode === "signup" && "Create account"}
              {mode === "reset" && "Send reset link"}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            {mode === "signin" && (
              <>
                <div>New to BidFlow?{" "}
                  <button className="font-medium text-foreground underline underline-offset-4" onClick={() => setMode("signup")}>Create account</button>
                </div>
                <div>
                  <button className="text-muted-foreground hover:text-foreground" onClick={() => setMode("reset")}>Forgot password?</button>
                </div>
              </>
            )}
            {mode === "signup" && (
              <div>Have an account?{" "}
                <button className="font-medium text-foreground underline underline-offset-4" onClick={() => setMode("signin")}>Sign in</button>
              </div>
            )}
            {mode === "reset" && (
              <div>
                <button className="font-medium text-foreground underline underline-offset-4" onClick={() => setMode("signin")}>Back to sign in</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
