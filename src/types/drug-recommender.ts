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

export interface DrugRecommendation {
  name: string;
  confidence: number;
  dosage: string;
  frequency: string;
  effectiveness: string;
  side_effects_risk: string;
  condition_match: string;
}

export interface ShapExplanation {
  feature: string;
  influence: number;
  direction: "positive" | "negative";
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: "low" | "moderate" | "high";
  description: string;
}

export interface PredictionResponse {
  recommendations: DrugRecommendation[];
  explanations: ShapExplanation[];
  interactions: DrugInteraction[];
}

export interface EHRRecord {
  patient_id?: number;
  age: number;
  gender: string;
  heart_rate: number;
  blood_type: string;
  allergies: string;
  medical_history: string;
  symptoms: string;
  current_medications: string;
  recommended_drug?: string;
  [key: string]: string | number | undefined;
}
