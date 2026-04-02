import { useState } from "react";
import { CloudRain, Thermometer, Wind, Car } from "lucide-react";
import StatusHeader from "@/components/StatusHeader";
import RiskPulse from "@/components/RiskPulse";
import PayoutBanner from "@/components/PayoutBanner";
import TelemetryCard from "@/components/TelemetryCard";
import MicroLedger from "@/components/MicroLedger";
import PolicyCard from "@/components/PolicyCard";
import PolicyManagement from "@/components/PolicyManagement";
import DynamicPricing from "@/components/DynamicPricing";

const telemetry = [
  { icon: CloudRain, label: "Rainfall", value: "18.2", unit: "mm/hr", status: "critical" as const },
  { icon: Thermometer, label: "Temperature", value: "34", unit: "°C", status: "elevated" as const },
  { icon: Wind, label: "AQI", value: "187", unit: "index", status: "elevated" as const },
  { icon: Car, label: "Traffic", value: "Low", unit: "flow", status: "normal" as const },
];

interface RiskState {
  level: "normal" | "warning" | "critical";
  value: number;
  label: string;
}

const Index = () => {
  const [risk, setRisk] = useState<RiskState>({
    level: "warning",
    value: 72,
    label: "Heavy rainfall approaching threshold · AQI elevated",
  });

  const handleRiskUpdate = (riskScore: number) => {
    try {
      // Validate input
      if (typeof riskScore !== "number" || isNaN(riskScore)) {
        console.error("Invalid risk score:", riskScore);
        return;
      }

      // Clamp value between 0 and 1
      const clampedScore = Math.max(0, Math.min(1, riskScore));

      let level: "normal" | "warning" | "critical" = "normal";
      let label = "Conditions normal · Safe to operate";

      if (clampedScore <= 0.3) {
        level = "normal";
        label = "Risk score low · Optimal conditions for delivery";
      } else if (clampedScore <= 0.6) {
        level = "warning";
        label = "Risk score medium · Caution advised";
      } else {
        level = "critical";
        label = "Risk score high · Consider reducing hours";
      }

      setRisk({
        level,
        value: Math.round(clampedScore * 100),
        label,
      });
    } catch (error) {
      console.error("Error updating risk status:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-lg mx-auto px-4 pb-8">
        <StatusHeader />
        
        <div className="mt-2">
          <PayoutBanner />
        </div>

        <div className="mt-6">
          <RiskPulse level={risk.level} value={risk.value} label={risk.label} />
        </div>

        <div className="mt-6">
          <DynamicPricing onRiskUpdate={handleRiskUpdate} />
        </div>

        <div className="mt-6">
          <span className="data-label mb-3 block">Live Telemetry</span>
          <div className="grid grid-cols-2 gap-3">
            {telemetry.map((t, i) => (
              <TelemetryCard key={t.label} {...t} index={i} />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <PolicyCard />
        </div>

        <div className="mt-6">
          <PolicyManagement />
        </div>

        <div className="mt-6">
          <MicroLedger />
        </div>

        <footer className="mt-8 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.1em]">
            Your income, protected by the atmosphere.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
