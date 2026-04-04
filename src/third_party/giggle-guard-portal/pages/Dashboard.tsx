import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, FileText, AlertTriangle, TrendingUp, Plus, DollarSign } from "lucide-react";
import PolicyManagement from "@/components/PolicyManagement";

interface Policy {
  id: string;
  worker_name: string;
  policy_number: string;
  coverage_type: string;
  weekly_premium: number;
  active: boolean;
  notes?: string;
}

export default function Dashboard() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/policies");
      const data = response.ok ? await response.json() : [];
      setPolicies(Array.isArray(data) ? data : []);
    } catch {
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const activePolicies = useMemo(() => policies.filter((p) => p.active), [policies]);
  const totalCoverage = activePolicies.length * 100000;
  const monthlyPremium = activePolicies.reduce((sum, p) => sum + Number(p.weekly_premium || 0), 0) * 4;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            <span className="font-display text-lg font-bold">GigGuard Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">Live Monitor</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/auth">
                <FileText className="h-4 w-4 mr-1" /> Auth
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Integrated Portal</h1>
          <p className="text-muted-foreground mt-1">Policies now attach through your backend API from this screen.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activePolicies.length}</p>
                  <p className="text-xs text-muted-foreground">Active Policies</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${totalCoverage.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Estimated Coverage</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                  <DollarSign className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${monthlyPremium.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Monthly Premium</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loading ? "..." : Math.max(0, policies.length - activePolicies.length)}</p>
                  <p className="text-xs text-muted-foreground">Inactive Policies</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">Saved Policies</CardTitle>
            <CardDescription>Data from `/api/policies`</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading policies...</p>
            ) : policies.length === 0 ? (
              <p className="text-muted-foreground text-sm">No policies yet. Use the form below to attach one.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {policies.slice(0, 6).map((policy) => (
                  <div key={policy.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{policy.worker_name}</p>
                      <Badge variant="outline" className={policy.active ? "text-success border-success/20" : "text-muted-foreground"}>
                        {policy.active ? "active" : "inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{policy.policy_number} · {policy.coverage_type}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Button size="sm" onClick={fetchPolicies}>
                <Plus className="h-4 w-4 mr-1" /> Refresh Policies
              </Button>
            </div>
          </CardContent>
        </Card>

        <PolicyManagement />
      </main>
    </div>
  );
}
