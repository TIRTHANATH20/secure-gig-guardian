from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import traceback

import dynamic_pricing as dp
import policy_management as pm
import os

MODEL_PATH = "model.joblib"

app = FastAPI(title="Dynamic Pricing API")

# Add CORS middleware BEFORE other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods including OPTIONS
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],
)

# Note: Static files will be mounted after API routes to avoid intercepting POSTs to /api


class PredictRequest(BaseModel):
    rainfall: float = Field(ge=0, description="Rainfall in mm")
    temperature: float = Field(ge=-50, le=60, description="Temperature in Celsius")
    aqi: float = Field(ge=0, description="Air Quality Index")
    safe_zone: float = Field(ge=0, le=1, description="Safe zone score between 0 and 1")


class PolicyBase(BaseModel):
    worker_name: str = Field(..., description="Worker name for the policy")
    policy_number: str = Field(..., description="Unique policy number")
    coverage_type: str = Field(..., description="Selected coverage tier")
    weekly_premium: float = Field(ge=0, description="Weekly premium amount")
    active: bool = Field(default=True, description="Whether the policy is currently active")
    notes: Optional[str] = Field(None, description="Optional policy notes")


class PolicyCreate(PolicyBase):
    pass


class PolicyUpdate(BaseModel):
    worker_name: Optional[str] = None
    policy_number: Optional[str] = None
    coverage_type: Optional[str] = None
    weekly_premium: Optional[float] = None
    active: Optional[bool] = None
    notes: Optional[str] = None


class PolicyResponse(PolicyBase):
    id: str


@app.options("/api/predict")
async def options_predict():
    """Handle CORS preflight requests"""
    return {"message": "OK"}


@app.get("/api/policies", response_model=List[PolicyResponse])
def list_policies():
    try:
        return pm.list_policies()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/policies/{policy_id}", response_model=PolicyResponse)
def get_policy(policy_id: str):
    try:
        policy = pm.get_policy(policy_id)
        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")
        return policy
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/policies", response_model=PolicyResponse)
def create_policy(policy: PolicyCreate):
    try:
        return pm.create_policy(policy.dict())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/policies/{policy_id}", response_model=PolicyResponse)
def update_policy(policy_id: str, update: PolicyUpdate):
    try:
        updated = pm.update_policy(policy_id, update.dict(exclude_none=True))
        if not updated:
            raise HTTPException(status_code=404, detail="Policy not found")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/policies/{policy_id}")
def delete_policy(policy_id: str):
    try:
        deleted = pm.delete_policy(policy_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Policy not found")
        return {"deleted": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.on_event("startup")
def startup_event():
    global model
    try:
        # try to load persisted model first
        try:
            model = dp.load_model(MODEL_PATH)
            print(f"Loaded model from {MODEL_PATH}")
        except FileNotFoundError:
            print("No persisted model found, training new model...")
            model = dp.train_model()
            try:
                dp.save_model(model, MODEL_PATH)
                print(f"Saved trained model to {MODEL_PATH}")
            except Exception as e:
                print("Warning: failed to save model:", e)
    except Exception as e:
        print(f"Critical error during startup: {e}")
        traceback.print_exc()
        raise


@app.post("/api/predict")
def predict(req: PredictRequest):
    try:
        # Validate inputs
        if not isinstance(req.rainfall, (int, float)) or not isinstance(req.temperature, (int, float)):
            raise HTTPException(status_code=400, detail="Invalid rainfall or temperature")
        
        if not isinstance(req.aqi, (int, float)) or not isinstance(req.safe_zone, (int, float)):
            raise HTTPException(status_code=400, detail="Invalid AQI or safe zone")

        # Ensure model is loaded
        if 'model' not in globals() or model is None:
            raise HTTPException(status_code=500, detail="Model not initialized")

        # Call the dynamic pricing pipeline
        res = dp.dynamic_pricing_pipeline(model, req.rainfall, req.temperature, req.aqi, req.safe_zone)
        
        # Validate response
        if not res or not isinstance(res, dict):
            raise HTTPException(status_code=500, detail="Invalid response from model")
        
        if "risk_score" not in res or "weekly_premium" not in res or "coverage" not in res:
            raise HTTPException(status_code=500, detail="Missing fields in response")
        
        # Ensure values are in valid ranges
        if not (0 <= float(res["risk_score"]) <= 1):
            raise HTTPException(status_code=500, detail=f"Risk score out of range: {res['risk_score']}")
        
        if float(res["weekly_premium"]) < 0:
            raise HTTPException(status_code=500, detail=f"Invalid premium: {res['weekly_premium']}")
        
        return res
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in predict: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# Serve frontend static files after API is defined so API routes aren't shadowed.
if os.path.isdir("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")
