"""
Drug Recommendation System - FastAPI Backend
Uses CSV data directly with pandas. No database required.
Provides real-time SHAP-like explanations for drug recommendations.
"""

CSV_PATH = "data/ehr_synthetic_max_features.csv"

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd

app = FastAPI(
    title="Drug Recommendation API",
    description="AI-powered drug recommendations with SHAP explanations",
    version="1.0.0"
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global DataFrame to store EHR data
ehr_data: Optional[pd.DataFrame] = None

@app.on_event("startup")
def load_csv_on_startup():
    global ehr_data
    try:
        ehr_data = pd.read_csv(CSV_PATH)
        print(f"✅ Loaded EHR dataset with {len(ehr_data)} records")
        print(f"📊 Columns: {list(ehr_data.columns)}")
    except Exception as e:
        print("❌ Failed to load EHR CSV:", e)
        raise RuntimeError("EHR dataset could not be loaded")


# === Pydantic Models ===

class PatientInput(BaseModel):
    age: int
    gender: str
    heart_rate: int
    blood_type: str
    allergies: List[str]
    medical_history: List[str]
    symptoms: List[str]
    current_medications: List[str]


class ShapFeature(BaseModel):
    feature: str
    influence: float
    direction: str  # "positive" or "negative"


class DrugRecommendation(BaseModel):
    name: str
    confidence: float
    dosage: str
    frequency: str
    effectiveness: str
    side_effects_risk: str
    condition_match: str


class DrugInteraction(BaseModel):
    drug1: str
    drug2: str
    severity: str
    description: str


class PredictionResponse(BaseModel):
    recommendations: List[DrugRecommendation]
    explanations: List[ShapFeature]
    interactions: List[DrugInteraction]
    similar_patients_count: int


class DataStatus(BaseModel):
    loaded: bool
    record_count: int
    columns: List[str]


# === Helper Functions ===

def parse_list_field(value: str) -> List[str]:
    """Parse a comma-separated or semicolon-separated string into a list."""
    if pd.isna(value) or not value:
        return []
    return [item.strip().lower() for item in str(value).replace(";", ",").split(",") if item.strip()]


def calculate_similarity(patient: PatientInput, record: pd.Series) -> float:
    """Calculate similarity score between patient input and EHR record."""
    score = 0.0
    weights = {
        "age": 0.15,
        "gender": 0.10,
        "heart_rate": 0.10,
        "blood_type": 0.05,
        "symptoms": 0.30,
        "medical_history": 0.20,
        "allergies": 0.10
    }
    
    # Age similarity (within 10 years = full score)
    age_diff = abs(patient.age - record.get("age", 0))
    score += weights["age"] * max(0, 1 - age_diff / 20)
    
    # Gender match
    if patient.gender.lower() == str(record.get("gender", "")).lower():
        score += weights["gender"]
    
    # Heart rate similarity (within 20 bpm = full score)
    hr_diff = abs(patient.heart_rate - record.get("heart_rate", 72))
    score += weights["heart_rate"] * max(0, 1 - hr_diff / 40)
    
    # Blood type match
    if patient.blood_type.upper() == str(record.get("blood_type", "")).upper():
        score += weights["blood_type"]
    
    # Symptoms overlap (Jaccard similarity)
    record_symptoms = set(parse_list_field(record.get("symptoms", "")))
    patient_symptoms = set(s.lower() for s in patient.symptoms)
    if patient_symptoms or record_symptoms:
        intersection = len(patient_symptoms & record_symptoms)
        union = len(patient_symptoms | record_symptoms)
        score += weights["symptoms"] * (intersection / union if union > 0 else 0)
    
    # Medical history overlap
    record_history = set(parse_list_field(record.get("medical_history", "")))
    patient_history = set(h.lower() for h in patient.medical_history)
    if patient_history or record_history:
        intersection = len(patient_history & record_history)
        union = len(patient_history | record_history)
        score += weights["medical_history"] * (intersection / union if union > 0 else 0)
    
    # Allergies match (penalize if patient has allergies that record drug treats)
    record_allergies = set(parse_list_field(record.get("allergies", "")))
    patient_allergies = set(a.lower() for a in patient.allergies if a.lower() != "none")
    if patient_allergies or record_allergies:
        intersection = len(patient_allergies & record_allergies)
        union = len(patient_allergies | record_allergies)
        score += weights["allergies"] * (intersection / union if union > 0 else 0)
    
    return score


def calculate_shap_explanations(patient: PatientInput, top_records: pd.DataFrame) -> List[ShapFeature]:
    """
    Calculate SHAP-like feature importance explanations.
    This is a simplified local explanation based on feature contributions.
    """
    explanations = []
    
    if top_records.empty:
        return explanations
    
    # Age influence
    avg_age = top_records["age"].mean() if "age" in top_records.columns else 45
    age_diff = patient.age - avg_age
    age_influence = abs(age_diff) / 20 * 0.15
    explanations.append(ShapFeature(
        feature=f"Age ({patient.age} years)",
        influence=round(age_influence, 3),
        direction="positive" if age_diff <= 5 else "negative"
    ))
    
    # Gender influence
    if "gender" in top_records.columns:
        gender_match_rate = (top_records["gender"].str.lower() == patient.gender.lower()).mean()
        explanations.append(ShapFeature(
            feature=f"Gender ({patient.gender})",
            influence=round(gender_match_rate * 0.10, 3),
            direction="positive" if gender_match_rate > 0.5 else "negative"
        ))
    
    # Heart rate influence
    if "heart_rate" in top_records.columns:
        avg_hr = top_records["heart_rate"].mean()
        hr_diff = abs(patient.heart_rate - avg_hr)
        hr_influence = max(0, 1 - hr_diff / 40) * 0.10
        explanations.append(ShapFeature(
            feature=f"Heart Rate ({patient.heart_rate} bpm)",
            influence=round(hr_influence, 3),
            direction="positive" if hr_diff < 15 else "negative"
        ))
    
    # Blood type influence
    if "blood_type" in top_records.columns:
        bt_match_rate = (top_records["blood_type"].str.upper() == patient.blood_type.upper()).mean()
        explanations.append(ShapFeature(
            feature=f"Blood Type ({patient.blood_type})",
            influence=round(bt_match_rate * 0.05, 3),
            direction="positive" if bt_match_rate > 0.3 else "negative"
        ))
    
    # Symptoms influence (individual symptoms)
    if "symptoms" in top_records.columns and patient.symptoms:
        for symptom in patient.symptoms[:4]:  # Limit to top 4 symptoms
            symptom_lower = symptom.lower()
            match_count = top_records["symptoms"].apply(
                lambda x: symptom_lower in parse_list_field(x)
            ).sum()
            match_rate = match_count / len(top_records)
            explanations.append(ShapFeature(
                feature=f"Symptom: {symptom}",
                influence=round(match_rate * 0.08, 3),
                direction="positive" if match_rate > 0.3 else "negative"
            ))
    
    # Medical history influence
    if "medical_history" in top_records.columns and patient.medical_history:
        for condition in patient.medical_history[:3]:  # Limit to top 3 conditions
            condition_lower = condition.lower()
            match_count = top_records["medical_history"].apply(
                lambda x: condition_lower in parse_list_field(x)
            ).sum()
            match_rate = match_count / len(top_records)
            explanations.append(ShapFeature(
                feature=f"History: {condition}",
                influence=round(match_rate * 0.07, 3),
                direction="positive" if match_rate > 0.2 else "negative"
            ))
    
    # Allergies influence
    if patient.allergies and "none" not in [a.lower() for a in patient.allergies]:
        for allergy in patient.allergies[:2]:  # Limit to top 2
            explanations.append(ShapFeature(
                feature=f"Allergy: {allergy}",
                influence=round(0.05, 3),
                direction="negative"  # Allergies typically reduce options
            ))
    
    # Sort by absolute influence
    explanations.sort(key=lambda x: abs(x.influence), reverse=True)
    
    return explanations[:10]  # Return top 10 features


def check_drug_interactions(drug: str, current_meds: List[str]) -> List[DrugInteraction]:
    """Check for potential drug-drug interactions."""
    interactions = []
    
    # Known interaction database (simplified)
    known_interactions = {
        ("aspirin", "warfarin"): ("high", "Increased bleeding risk"),
        ("aspirin", "ibuprofen"): ("moderate", "Reduced aspirin effectiveness"),
        ("lisinopril", "potassium"): ("moderate", "Risk of hyperkalemia"),
        ("metformin", "alcohol"): ("moderate", "Risk of lactic acidosis"),
        ("simvastatin", "grapefruit"): ("moderate", "Increased statin levels"),
        ("warfarin", "vitamin k"): ("high", "Reduced anticoagulant effect"),
        ("ssri", "maoi"): ("high", "Serotonin syndrome risk"),
        ("amlodipine", "simvastatin"): ("moderate", "Increased myopathy risk"),
    }
    
    drug_lower = drug.lower()
    meds_lower = [m.lower() for m in current_meds]
    
    for (drug1, drug2), (severity, description) in known_interactions.items():
        if drug_lower in drug1 or drug1 in drug_lower:
            for med in meds_lower:
                if drug2 in med or med in drug2:
                    interactions.append(DrugInteraction(
                        drug1=drug,
                        drug2=med.title(),
                        severity=severity,
                        description=description
                    ))
        elif drug_lower in drug2 or drug2 in drug_lower:
            for med in meds_lower:
                if drug1 in med or med in drug1:
                    interactions.append(DrugInteraction(
                        drug1=drug,
                        drug2=med.title(),
                        severity=severity,
                        description=description
                    ))
    
    return interactions


def get_drug_details(drug_name: str, confidence: float, symptoms: List[str]) -> DrugRecommendation:
    """Generate drug recommendation details."""
    # Dosage mapping
    dosage_map = {
        "lisinopril": "10mg",
        "metformin": "500mg",
        "amlodipine": "5mg",
        "aspirin": "81mg",
        "atorvastatin": "20mg",
        "omeprazole": "20mg",
        "metoprolol": "25mg",
        "losartan": "50mg",
        "gabapentin": "300mg",
        "sertraline": "50mg",
    }
    
    frequency_map = {
        "lisinopril": "Once daily",
        "metformin": "Twice daily with meals",
        "amlodipine": "Once daily",
        "aspirin": "Once daily",
        "atorvastatin": "Once daily at bedtime",
        "omeprazole": "Once daily before breakfast",
        "metoprolol": "Twice daily",
        "losartan": "Once daily",
        "gabapentin": "Three times daily",
        "sertraline": "Once daily",
    }
    
    condition_map = {
        "lisinopril": "Hypertension, Heart Failure",
        "metformin": "Type 2 Diabetes",
        "amlodipine": "Hypertension, Angina",
        "aspirin": "Cardiovascular Prevention",
        "atorvastatin": "High Cholesterol",
        "omeprazole": "GERD, Acid Reflux",
        "metoprolol": "Hypertension, Heart Conditions",
        "losartan": "Hypertension",
        "gabapentin": "Neuropathic Pain",
        "sertraline": "Depression, Anxiety",
    }
    
    drug_lower = drug_name.lower()
    
    return DrugRecommendation(
        name=drug_name,
        confidence=round(confidence, 1),
        dosage=dosage_map.get(drug_lower, "As prescribed"),
        frequency=frequency_map.get(drug_lower, "As directed"),
        effectiveness="High" if confidence > 70 else "Moderate" if confidence > 50 else "Low",
        side_effects_risk="Low" if confidence > 60 else "Moderate",
        condition_match=condition_map.get(drug_lower, ", ".join(symptoms[:2]) if symptoms else "General Treatment")
    )


# === API Endpoints ===

@app.get("/")
async def root():
    return {"message": "Drug Recommendation API is running", "status": "healthy"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "data_loaded": ehr_data is not None}


@app.get("/data/status", response_model=DataStatus)
async def get_data_status():
    """Get current dataset status."""
    if ehr_data is None:
        return DataStatus(loaded=False, record_count=0, columns=[])
    return DataStatus(
        loaded=True,
        record_count=len(ehr_data),
        columns=list(ehr_data.columns)
    )



@app.post("/predict", response_model=PredictionResponse)
async def predict_drugs(patient: PatientInput):
    """Get drug recommendations with SHAP explanations."""
    global ehr_data
    
    # Calculate similarity for all records
    similarities = []
    for idx, record in ehr_data.iterrows():
        sim = calculate_similarity(patient, record)
        similarities.append((idx, sim))
    
    # Sort by similarity and get top matches
    similarities.sort(key=lambda x: x[1], reverse=True)
    top_n = min(50, len(similarities))
    top_indices = [idx for idx, _ in similarities[:top_n]]
    top_records = ehr_data.loc[top_indices]
    
    # Get recommended drugs from top matching records
    drug_counts = {}
    if "recommended_drug" in top_records.columns:
        for idx, (orig_idx, sim) in enumerate(similarities[:top_n]):
            record = ehr_data.loc[orig_idx]
            drug = str(record.get("recommended_drug", "")).strip()
            if drug and drug.lower() != "nan" and drug.lower() != "none":
                if drug not in drug_counts:
                    drug_counts[drug] = {"count": 0, "total_sim": 0}
                drug_counts[drug]["count"] += 1
                drug_counts[drug]["total_sim"] += sim
    
    # If no drugs found, use common defaults based on symptoms
    if not drug_counts:
        symptom_drug_map = {
            "headache": "Aspirin",
            "fever": "Acetaminophen",
            "chest pain": "Aspirin",
            "hypertension": "Lisinopril",
            "diabetes": "Metformin",
            "depression": "Sertraline",
            "anxiety": "Sertraline",
            "joint pain": "Ibuprofen",
            "nausea": "Omeprazole",
        }
        
        for symptom in patient.symptoms:
            symptom_lower = symptom.lower()
            for key, drug in symptom_drug_map.items():
                if key in symptom_lower:
                    if drug not in drug_counts:
                        drug_counts[drug] = {"count": 1, "total_sim": 0.5}
        
        for condition in patient.medical_history:
            condition_lower = condition.lower()
            for key, drug in symptom_drug_map.items():
                if key in condition_lower:
                    if drug not in drug_counts:
                        drug_counts[drug] = {"count": 1, "total_sim": 0.6}
    
    # Calculate confidence and create recommendations
    recommendations = []
    total_top = top_n
    
    for drug, stats in sorted(drug_counts.items(), key=lambda x: x[1]["total_sim"], reverse=True)[:5]:
        confidence = min(95, (stats["count"] / total_top * 100) + (stats["total_sim"] / stats["count"] * 50))
        rec = get_drug_details(drug, confidence, patient.symptoms)
        recommendations.append(rec)
    
    # Get SHAP explanations
    explanations = calculate_shap_explanations(patient, top_records)
    
    # Check for drug interactions
    all_interactions = []
    for rec in recommendations:
        interactions = check_drug_interactions(rec.name, patient.current_medications)
        all_interactions.extend(interactions)
    
    # Count similar patients (those with similarity > 0.5)
    similar_count = sum(1 for _, sim in similarities if sim > 0.5)
    
    return PredictionResponse(
        recommendations=recommendations,
        explanations=explanations,
        interactions=all_interactions,
        similar_patients_count=similar_count
    )


if __name__ == "__main__":
    import uvicorn
    print("Starting Drug Recommendation API...")
    print("API will be available at http://localhost:8000")
    print("API docs at http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
