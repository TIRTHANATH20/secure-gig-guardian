import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";

interface PricingResult {
  risk_score: number;
  weekly_premium: number;
  coverage: string;
}

interface DynamicPricingProps {
  onRiskUpdate?: (riskScore: number) => void;
}

const DynamicPricing = ({ onRiskUpdate }: DynamicPricingProps) => {
  try {
    const [rainfall, setRainfall] = useState<string>("");
    const [temperature, setTemperature] = useState<string>("");
    const [aqi, setAqi] = useState<string>("");
    const [safeZone, setSafeZone] = useState<string>("");
    const [result, setResult] = useState<PricingResult | null>(null);
    const [loading, setLoading] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const requestCountRef = useRef(0);

    // Cleanup on unmount
    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
      };
    }, []);

    const handleCalculate = useCallback(
      async (rainfallVal: string, tempVal: string, aqiVal: string, safeZoneVal: string) => {
        try {
          if (!isMountedRef.current) return;

          // Validate inputs exist
          if (!rainfallVal || !tempVal || !aqiVal || !safeZoneVal) {
            if (isMountedRef.current) {
              setResult(null);
            }
            return;
          }

          const rainfallNum = parseFloat(rainfallVal);
          const tempNum = parseFloat(tempVal);
          const aqiNum = parseFloat(aqiVal);
          const safeZoneNum = parseFloat(safeZoneVal);

          // Validate all are valid numbers
          if (isNaN(rainfallNum) || isNaN(tempNum) || isNaN(aqiNum) || isNaN(safeZoneNum)) {
            if (isMountedRef.current) {
              setResult(null);
            }
            return;
          }

          // Validate ranges
          if (rainfallNum < 0 || tempNum < -50 || tempNum > 60 || aqiNum < 0 || safeZoneNum < 0 || safeZoneNum > 1) {
            if (isMountedRef.current) {
              setResult(null);
            }
            return;
          }

          if (!isMountedRef.current) return;
          setLoading(true);

          requestCountRef.current += 1;
          const currentRequest = requestCountRef.current;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            try {
              controller.abort();
            } catch (e) {
              // ignore abort errors
            }
          }, 5000);

          try {
            const API_BASE = (import.meta.env && import.meta.env.VITE_API_URL) || "/api";
            const response = await fetch(`${API_BASE}/predict`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                rainfall: Math.max(0, rainfallNum),
                temperature: Math.max(-50, Math.min(60, tempNum)),
                aqi: Math.max(0, aqiNum),
                safe_zone: Math.max(0, Math.min(1, safeZoneNum)),
              }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Ignore responses from old requests
            if (currentRequest !== requestCountRef.current || !isMountedRef.current) {
              return;
            }

            if (!response.ok) {
              if (isMountedRef.current) {
                setResult(null);
                setLoading(false);
              }
              return;
            }

            const data = await response.json();

            // Validate response
            if (!data || typeof data !== "object") {
              if (isMountedRef.current) {
                setResult(null);
                setLoading(false);
              }
              return;
            }

            const riskScore = Number(data.risk_score);
            const weeklyPremium = Number(data.weekly_premium);
            const coverage = String(data.coverage || "Standard Coverage");

            // Validate values
            if (isNaN(riskScore) || isNaN(weeklyPremium) || riskScore < 0 || riskScore > 1 || weeklyPremium < 0) {
              if (isMountedRef.current) {
                setResult(null);
                setLoading(false);
              }
              return;
            }

            if (isMountedRef.current && currentRequest === requestCountRef.current) {
              const validData: PricingResult = {
                risk_score: riskScore,
                weekly_premium: weeklyPremium,
                coverage: coverage,
              };
              setResult(validData);
              setLoading(false);

              // Update parent
              if (onRiskUpdate && typeof onRiskUpdate === "function") {
                try {
                  onRiskUpdate(riskScore);
                } catch (err) {
                  // ignore callback errors
                }
              }
            }
          } catch (err) {
            clearTimeout(timeoutId);
            if (isMountedRef.current && currentRequest === requestCountRef.current) {
              setResult(null);
              setLoading(false);
            }
          }
        } catch (err) {
          console.error("handleCalculate error:", err);
          if (isMountedRef.current) {
            setResult(null);
            setLoading(false);
          }
        }
      },
      [onRiskUpdate]
    );

    useEffect(() => {
      if (!isMountedRef.current) return;

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        if (isMountedRef.current) {
          handleCalculate(rainfall, temperature, aqi, safeZone);
        }
      }, 800);

      return () => {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
      };
    }, [rainfall, temperature, aqi, safeZone, handleCalculate]);

    const getRiskColor = (score: number): string => {
      try {
        if (typeof score !== "number") return "text-gray-600";
        if (isNaN(score)) return "text-gray-600";
        if (score <= 0.3) return "text-green-600";
        if (score <= 0.6) return "text-yellow-600";
        return "text-red-600";
      } catch {
        return "text-gray-600";
      }
    };

    const getRiskLevel = (score: number): string => {
      try {
        if (typeof score !== "number" || isNaN(score)) return "Unknown";
        if (score <= 0.3) return "Low";
        if (score <= 0.6) return "Medium";
        return "High";
      } catch {
        return "Unknown";
      }
    };

    return (
      <Card className="safety-card premium-interactive p-6 border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Dynamic Premium Calculator</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rainfall" className="text-sm">
                Rainfall (mm)
              </Label>
              <Input
                id="rainfall"
                type="number"
                placeholder="0"
                value={rainfall}
                onChange={(e) => setRainfall(e.target.value)}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temperature" className="text-sm">
                Temperature (°C)
              </Label>
              <Input
                id="temperature"
                type="number"
                placeholder="0"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                min="-50"
                max="60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aqi" className="text-sm">
                AQI
              </Label>
              <Input
                id="aqi"
                type="number"
                placeholder="0"
                value={aqi}
                onChange={(e) => setAqi(e.target.value)}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="safe-zone" className="text-sm">
                Safe Zone (0-1)
              </Label>
              <Input
                id="safe-zone"
                type="number"
                placeholder="0"
                step="0.1"
                min="0"
                max="1"
                value={safeZone}
                onChange={(e) => setSafeZone(e.target.value)}
              />
            </div>
          </div>

          {result ? (
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Risk Score</p>
                <div className={`text-2xl font-bold ${getRiskColor(result.risk_score)}`}>
                  {(result.risk_score * 100).toFixed(1)}% ({getRiskLevel(result.risk_score)})
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Weekly Premium</p>
                <p className="text-2xl font-bold text-primary">₹{result.weekly_premium.toFixed(2)}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Coverage</p>
                <p className="text-sm font-medium">{result.coverage}</p>
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                {loading ? "Calculating..." : "Enter values to calculate premium"}
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  } catch (error) {
    console.error("DynamicPricing component error:", error);
    return (
      <Card className="p-6 bg-card border border-border">
        <div className="text-center">
          <p className="text-sm text-destructive">Component error - Please refresh the page</p>
        </div>
      </Card>
    );
  }
};

export default DynamicPricing;
