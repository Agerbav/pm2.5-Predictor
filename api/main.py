from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np

app = FastAPI()

# ---------------------------
# 🔥 ENABLE CORS
# ---------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # atau ganti dengan ["http://127.0.0.1:5500"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------

model = joblib.load("model_pm25.pkl")

class Input(BaseModel):
    pm10: float
    so2: float
    co: float
    o3: float
    no2: float
    max_val: float
    year: int
    month: int
    day: int
    stasiun_code: int

@app.post("/predict")
def predict(data: Input):
    x = np.array([[data.pm10, data.so2, data.co, data.o3,
                   data.no2, data.max_val,
                   data.year, data.month, data.day, data.stasiun_code]])

    pred = model.predict(x)[0]
    return {"pm25_prediction": float(pred)}
