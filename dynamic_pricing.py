# dynamic_premium_final.py

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import joblib
import os

# -------------------------------
# GLOBAL SCALER
# -------------------------------
scaler = StandardScaler()


# -------------------------------
# STEP 1: TRAIN MODEL (ML PART)
# -------------------------------
def train_model():
    try:
        # Features: [rainfall, temperature, aqi, safe_zone]
        X = np.array([
            [10, 30, 100, 0.9],
            [70, 38, 250, 0.2],
            [50, 35, 300, 0.4],
            [5, 28, 80, 0.95],
            [80, 40, 350, 0.1],
            [20, 32, 150, 0.8],
            [60, 36, 280, 0.3],
            [90, 42, 400, 0.1],
            [30, 34, 120, 0.7],
            [100, 45, 450, 0.05]
        ])

        # Risk scores (training targets)
        y = np.array([
            0.2, 0.9, 0.7, 0.1, 1.0,
            0.3, 0.8, 1.0, 0.4, 1.0
        ])

        X_scaled = scaler.fit_transform(X)

        model = LinearRegression()
        model.fit(X_scaled, y)

        return model
    except Exception as e:
        print(f"Error training model: {e}")
        raise


def save_model(model, path: str = "model.joblib"):
    """Persist trained model and scaler together."""
    try:
        joblib.dump({"model": model, "scaler": scaler}, path)
    except Exception as e:
        print(f"Error saving model: {e}")
        raise


def load_model(path: str = "model.joblib"):
    """Load trained model and set global scaler. Raises FileNotFoundError if absent."""
    try:
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found: {path}")
        data = joblib.load(path)
        # restore scaler globally
        global scaler
        scaler = data.get("scaler", scaler)
        return data.get("model")
    except Exception as e:
        print(f"Error loading model: {e}")
        raise


# -------------------------------
# STEP 2: HYBRID AI RISK MODEL
# -------------------------------
def predict_risk(model, rainfall, temperature, aqi, safe_zone):
    try:
        # Validate inputs
        if not all(isinstance(x, (int, float)) and not np.isnan(x) for x in [rainfall, temperature, aqi, safe_zone]):
            raise ValueError("All inputs must be valid numbers")

        # Clamp values to reasonable ranges
        rainfall = max(0, float(rainfall))
        temperature = max(-50, float(temperature))
        aqi = max(0, float(aqi))
        safe_zone = max(0, min(1, float(safe_zone)))

        # ML prediction
        features = np.array([[rainfall, temperature, aqi, safe_zone]])
        features_scaled = scaler.transform(features)
        ml_risk = model.predict(features_scaled)[0]

        # Ensure ml_risk is between 0 and 1
        ml_risk = max(0, min(1, float(ml_risk)))

        # Strong domain logic (more reliable)
        rule_risk = (
            (rainfall / 100) * 0.5 +     # increase weight
            (temperature / 50) * 0.2 +
            (aqi / 500) * 0.4 -
            (safe_zone * 0.15)           # reduce safe zone impact
        )

        # Clamp rule_risk
        rule_risk = max(0, min(1, float(rule_risk)))

        # Final hybrid (more weight to rule)
        final_risk = 0.3 * ml_risk + 0.7 * rule_risk

        return max(0, min(round(float(final_risk), 2), 1))
    except Exception as e:
        print(f"Error predicting risk: {e}")
        raise


# -------------------------------
# STEP 3: PREMIUM CALCULATION
# -------------------------------
def calculate_premium(risk_score, safe_zone):
    try:
        # Validate inputs
        if not isinstance(risk_score, (int, float)) or not isinstance(safe_zone, (int, float)):
            raise ValueError("Risk score and safe zone must be numbers")

        risk_score = max(0, min(1, float(risk_score)))
        safe_zone = max(0, min(1, float(safe_zone)))

        base_price = 25
        multiplier = 20

        premium = base_price + (risk_score * multiplier)

        # Safe zone discount
        if safe_zone > 0.7:
            premium -= 2

        # High risk surcharge
        if risk_score > 0.7:
            premium += 5

        return round(max(premium, 15), 2)
    except Exception as e:
        print(f"Error calculating premium: {e}")
        raise


# -------------------------------
# STEP 4: COVERAGE ADJUSTMENT
# -------------------------------
def adjust_coverage(risk_score):
    try:
        # Validate input
        if not isinstance(risk_score, (int, float)):
            raise ValueError("Risk score must be a number")

        risk_score = max(0, min(1, float(risk_score)))

        if risk_score > 0.7:
            return "Extended Coverage (10 hrs/day)"
        elif risk_score > 0.4:
            return "Standard Coverage (6 hrs/day)"
        else:
            return "Basic Coverage (4 hrs/day)"
    except Exception as e:
        print(f"Error adjusting coverage: {e}")
        return "Standard Coverage (6 hrs/day)"  # Default fallback


# -------------------------------
# FINAL PIPELINE
# -------------------------------
def dynamic_pricing_pipeline(model, rainfall, temperature, aqi, safe_zone):
    try:
        # Validate model
        if model is None:
            raise ValueError("Model is not initialized")

        # Predict risk
        risk_score = predict_risk(model, rainfall, temperature, aqi, safe_zone)

        # Calculate premium
        premium = calculate_premium(risk_score, safe_zone)

        # Adjust coverage
        coverage = adjust_coverage(risk_score)

        # Validate output
        result = {
            "risk_score": risk_score,
            "weekly_premium": premium,
            "coverage": coverage,
        }

        # Ensure all values are serializable
        return {
            "risk_score": float(result["risk_score"]),
            "weekly_premium": float(result["weekly_premium"]),
            "coverage": str(result["coverage"]),
        }
    except Exception as e:
        print(f"Error in dynamic pricing pipeline: {e}")
        raise


# -------------------------------
# RUN DEMO
# -------------------------------
if __name__ == "__main__":
    try:
        print("=== AI Dynamic Premium Calculator ===")

        # Train AI model
        model = train_model()

        # User inputs
        rainfall = float(input("Rainfall (mm): "))
        temperature = float(input("Temperature (°C): "))
        aqi = float(input("AQI: "))
        safe_zone = float(input("Zone Safety Score (0-1): "))

        result = dynamic_pricing_pipeline(model, rainfall, temperature, aqi, safe_zone)

        print("\n--- RESULT ---")
        print(f"Risk Score: {result['risk_score']}")
        print(f"Weekly Premium: ₹{result['weekly_premium']}")
        print(f"Coverage: {result['coverage']}")
    except ValueError as e:
        print(f"Invalid input: {e}")
    except Exception as e:
        print(f"Error: {e}")
    print(f"Coverage: {result['coverage']}")