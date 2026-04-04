import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Sparkles } from "lucide-react";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, fullName);
        toast.success("Account created! Check your email to confirm.");
      } else {
        await signIn(email, password);
        toast.success("Welcome back!");
        navigate("/");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-8 sm:py-12">
      <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-5xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-card/75 via-card/60 to-background/80 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/15 px-4 py-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">SurakshaAI</span>
          </div>
          <h1 className="mt-5 text-4xl font-display font-bold leading-tight text-foreground sm:text-5xl">
            Insurance intelligence built for the speed of gig work.
          </h1>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            SurakshaAI protects your income with policy clarity, faster claim workflows, and risk-aware coverage decisions.
          </p>

          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-background/45 px-4 py-3 text-muted-foreground">
              <span className="font-semibold text-foreground">Real-time Coverage Pulse</span>
              <p className="mt-1 text-xs">Track policy and risk signals in one secure workspace.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-background/45 px-4 py-3 text-muted-foreground">
              <span className="font-semibold text-foreground">Claim Confidence Layer</span>
              <p className="mt-1 text-xs">Submit and monitor claims with owner-safe isolation by design.</p>
            </div>
          </div>
        </section>

        <Card className="w-full border-primary/25 bg-card/85 shadow-2xl shadow-primary/10 backdrop-blur">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
              <Shield className="h-7 w-7 text-primary-foreground" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">SurakshaAI</p>
            <CardTitle className="text-2xl font-display">{isSignUp ? "Create Account" : "Welcome Back"}</CardTitle>
            <CardDescription>{isSignUp ? "Start protecting your gig income" : "Sign in to your insurance dashboard"}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="John Doe" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="********" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button onClick={() => setIsSignUp(!isSignUp)} className="font-medium text-primary underline-offset-4 hover:underline">
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
