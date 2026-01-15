import type {
  PatientInput,
  DrugRecommendation,
  ShapExplanation,
  DrugInteraction,
  PredictionResponse,
  EHRRecord,
} from "@/types/drug-recommender";

// Parse comma-separated strings to arrays
const parseList = (str: string | undefined): string[] => {
  if (!str || typeof str !== "string") return [];
  return str.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
};

// Calculate similarity between patient and record
const calculateSimilarity = (patient: PatientInput, record: EHRRecord): number => {
  let score = 0;
  let weights = 0;

  // Age similarity (weight: 2)
  const ageDiff = Math.abs(patient.age - record.age);
  score += (1 - Math.min(ageDiff / 50, 1)) * 2;
  weights += 2;

  // Gender match (weight: 1)
  if (patient.gender.toLowerCase() === record.gender?.toLowerCase()) {
    score += 1;
  }
  weights += 1;

  // Heart rate similarity (weight: 1.5)
  const hrDiff = Math.abs(patient.heart_rate - record.heart_rate);
  score += (1 - Math.min(hrDiff / 100, 1)) * 1.5;
  weights += 1.5;

  // Blood type match (weight: 1)
  if (patient.blood_type.toLowerCase() === record.blood_type?.toLowerCase()) {
    score += 1;
  }
  weights += 1;

  // Symptom overlap (weight: 3)
  const recordSymptoms = parseList(record.symptoms);
  const patientSymptoms = patient.symptoms.map((s) => s.toLowerCase());
  const symptomOverlap = patientSymptoms.filter((s) =>
    recordSymptoms.some((rs) => rs.includes(s) || s.includes(rs))
  ).length;
  score += (symptomOverlap / Math.max(patientSymptoms.length, 1)) * 3;
  weights += 3;

  // Medical history overlap (weight: 2)
  const recordHistory = parseList(record.medical_history);
  const patientHistory = patient.medical_history.map((h) => h.toLowerCase());
  const historyOverlap = patientHistory.filter((h) =>
    recordHistory.some((rh) => rh.includes(h) || h.includes(rh))
  ).length;
  score += (historyOverlap / Math.max(patientHistory.length, 1)) * 2;
  weights += 2;

  return score / weights;
};

// Calculate SHAP-like feature importance
const calculateShapExplanations = (
  patient: PatientInput,
  topRecords: EHRRecord[]
): ShapExplanation[] => {
  const explanations: ShapExplanation[] = [];

  // Age influence
  const avgAge = topRecords.reduce((sum, r) => sum + r.age, 0) / topRecords.length;
  const ageInfluence = (patient.age - avgAge) / 50;
  explanations.push({
    feature: "Age",
    influence: Math.abs(ageInfluence) * 0.8,
    direction: ageInfluence >= 0 ? "positive" : "negative",
  });

  // Heart rate influence
  const avgHR = topRecords.reduce((sum, r) => sum + r.heart_rate, 0) / topRecords.length;
  const hrInfluence = (patient.heart_rate - avgHR) / 40;
  explanations.push({
    feature: "Heart Rate",
    influence: Math.abs(hrInfluence) * 0.6,
    direction: hrInfluence >= 0 ? "positive" : "negative",
  });

  // Symptom count influence
  const symptomInfluence = patient.symptoms.length * 0.15;
  explanations.push({
    feature: "Symptoms",
    influence: symptomInfluence,
    direction: "positive",
  });

  // Medical history influence
  const historyInfluence = patient.medical_history.length * 0.12;
  explanations.push({
    feature: "Medical History",
    influence: historyInfluence,
    direction: patient.medical_history.length > 2 ? "negative" : "positive",
  });

  // Current medications influence
  const medInfluence = patient.current_medications.length * 0.1;
  explanations.push({
    feature: "Current Medications",
    influence: medInfluence,
    direction: patient.current_medications.length > 3 ? "negative" : "positive",
  });

  // Allergies influence
  const allergyInfluence = patient.allergies.length * 0.2;
  explanations.push({
    feature: "Allergies",
    influence: allergyInfluence,
    direction: "negative",
  });

  return explanations.sort((a, b) => b.influence - a.influence);
};

// Check for drug interactions
const checkInteractions = (
  recommendedDrugs: string[],
  currentMedications: string[]
): DrugInteraction[] => {
  const knownInteractions: Record<string, { drugs: string[]; severity: "low" | "moderate" | "high"; description: string }> = {
    warfarin: {
      drugs: ["aspirin", "ibuprofen", "naproxen"],
      severity: "high",
      description: "Increased bleeding risk",
    },
    metformin: {
      drugs: ["alcohol", "contrast dye"],
      severity: "moderate",
      description: "Risk of lactic acidosis",
    },
    lisinopril: {
      drugs: ["potassium", "spironolactone"],
      severity: "moderate",
      description: "Risk of hyperkalemia",
    },
    simvastatin: {
      drugs: ["grapefruit", "amiodarone"],
      severity: "moderate",
      description: "Increased statin levels",
    },
  };

  const interactions: DrugInteraction[] = [];
  const allDrugs = [...recommendedDrugs, ...currentMedications].map((d) => d.toLowerCase());

  for (const drug of allDrugs) {
    const interactionInfo = knownInteractions[drug];
    if (interactionInfo) {
      for (const interactingDrug of interactionInfo.drugs) {
        if (allDrugs.includes(interactingDrug)) {
          interactions.push({
            drug1: drug,
            drug2: interactingDrug,
            severity: interactionInfo.severity,
            description: interactionInfo.description,
          });
        }
      }
    }
  }

  return interactions;
};

// Main prediction function
export const predictDrugs = (
  patient: PatientInput,
  ehrData: EHRRecord[]
): PredictionResponse => {
  if (ehrData.length === 0) {
    return {
      recommendations: [],
      explanations: [],
      interactions: [],
    };
  }

  // Calculate similarity scores for all records
  const scoredRecords = ehrData
    .map((record) => ({
      record,
      similarity: calculateSimilarity(patient, record),
    }))
    .sort((a, b) => b.similarity - a.similarity);

  // Get top matching records
  const topRecords = scoredRecords.slice(0, Math.min(20, scoredRecords.length));

  // Aggregate drug recommendations
  const drugCounts = new Map<string, { count: number; records: EHRRecord[] }>();
  for (const { record } of topRecords) {
    const drug = record.recommended_drug || record.medication || record.drug;
    if (drug && typeof drug === "string") {
      const existing = drugCounts.get(drug) || { count: 0, records: [] };
      drugCounts.set(drug, {
        count: existing.count + 1,
        records: [...existing.records, record],
      });
    }
  }

  // Create recommendations
  const recommendations: DrugRecommendation[] = Array.from(drugCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([name, data], index) => {
      const confidence = (data.count / topRecords.length) * 100;
      return {
        name,
        confidence: Math.round(confidence * 10) / 10,
        dosage: getDosage(name, patient.age),
        frequency: getFrequency(name),
        effectiveness: getEffectiveness(confidence),
        side_effects_risk: getSideEffectsRisk(patient),
        condition_match: getConditionMatch(patient.symptoms),
      };
    });

  // Calculate explanations
  const explanations = calculateShapExplanations(patient, topRecords.map((r) => r.record));

  // Check for drug interactions
  const interactions = checkInteractions(
    recommendations.map((r) => r.name),
    patient.current_medications
  );

  return {
    recommendations,
    explanations,
    interactions,
  };
};

// Helper functions for drug details
const getDosage = (drug: string, age: number): string => {
  const baseDosages: Record<string, string> = {
    metformin: "500mg",
    lisinopril: "10mg",
    amlodipine: "5mg",
    atorvastatin: "20mg",
    omeprazole: "20mg",
  };
  const dosage = baseDosages[drug.toLowerCase()] || "Standard dose";
  return age > 65 ? `${dosage} (adjusted for age)` : dosage;
};

const getFrequency = (drug: string): string => {
  const frequencies: Record<string, string> = {
    metformin: "Twice daily with meals",
    lisinopril: "Once daily",
    amlodipine: "Once daily",
    atorvastatin: "Once daily at bedtime",
    omeprazole: "Once daily before breakfast",
  };
  return frequencies[drug.toLowerCase()] || "As directed";
};

const getEffectiveness = (confidence: number): string => {
  if (confidence >= 70) return "High";
  if (confidence >= 40) return "Moderate";
  return "Variable";
};

const getSideEffectsRisk = (patient: PatientInput): string => {
  if (patient.allergies.length > 2) return "Elevated due to allergies";
  if (patient.age > 70) return "Moderate (age-related)";
  if (patient.current_medications.length > 4) return "Elevated due to polypharmacy";
  return "Low";
};

const getConditionMatch = (symptoms: string[]): string => {
  if (symptoms.length === 0) return "General";
  return symptoms.slice(0, 2).join(", ");
};
