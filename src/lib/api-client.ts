/**
 * API client for communicating with the Python FastAPI backend
 */

const API_BASE_URL = "http://localhost:8000";

export interface PatientInput {
  age: number;
  gender: string;
  heart_rate: number;
  blood_type: string;
  allergies: string[];
  medical_history: string[];
  symptoms: string[];
  current_medications: string[];
}

export interface ShapFeature {
  feature: string;
  influence: number;
  direction: "positive" | "negative";
}

export interface DrugRecommendation {
  name: string;
  confidence: number;
  dosage: string;
  frequency: string;
  effectiveness: string;
  side_effects_risk: string;
  condition_match: string;
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: "low" | "moderate" | "high";
  description: string;
}

export interface PredictionResponse {
  recommendations: DrugRecommendation[];
  explanations: ShapFeature[];
  interactions: DrugInteraction[];
  similar_patients_count: number;
}

export interface DataStatus {
  loaded: boolean;
  record_count: number;
  columns: string[];
}

export interface UploadResponse {
  success: boolean;
  message: string;
  columns: string[];
  record_count: number;
}

/**
 * Check if the backend API is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get current data status from backend
 */
export async function getDataStatus(): Promise<DataStatus> {
  const response = await fetch(`${API_BASE_URL}/data/status`);
  if (!response.ok) {
    throw new Error("Failed to get data status");
  }
  return response.json();
}

/**
 * Upload CSV file to backend
 */
export async function uploadCSV(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/data/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to upload CSV");
  }

  return response.json();
}

/**
 * Get drug recommendations from backend
 */
export async function predictDrugs(patient: PatientInput): Promise<PredictionResponse> {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patient),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get predictions");
  }

  return response.json();
}
