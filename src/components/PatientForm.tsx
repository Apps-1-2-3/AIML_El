import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Stethoscope } from "lucide-react";
import type { PatientInput } from "@/types/drug-recommender";

interface PatientFormProps {
  onSubmit: (patient: PatientInput) => void;
  isLoading: boolean;
}

const COMMON_SYMPTOMS = [
  "Headache",
  "Fever",
  "Fatigue",
  "Chest Pain",
  "Shortness of Breath",
  "Nausea",
  "Dizziness",
  "Joint Pain",
];

const COMMON_CONDITIONS = [
  "Hypertension",
  "Diabetes",
  "Heart Disease",
  "Asthma",
  "Arthritis",
  "Depression",
];

const COMMON_ALLERGIES = [
  "Penicillin",
  "Sulfa",
  "Aspirin",
  "Ibuprofen",
  "Latex",
  "None",
];

export const PatientForm = ({ onSubmit, isLoading}: PatientFormProps) => {
  const [formData, setFormData] = useState<PatientInput>({
    age: 45,
    gender: "male",
    heart_rate: 72,
    blood_type: "O+",
    allergies: [],
    medical_history: [],
    symptoms: [],
    current_medications: [],
  });

  const [newMedication, setNewMedication] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const toggleItem = (
    field: "symptoms" | "medical_history" | "allergies",
    item: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter((i) => i !== item)
        : [...prev[field], item],
    }));
  };

  const addMedication = () => {
    if (newMedication.trim()) {
      setFormData((prev) => ({
        ...prev,
        current_medications: [...prev.current_medications, newMedication.trim()],
      }));
      setNewMedication("");
    }
  };

  const removeMedication = (med: string) => {
    setFormData((prev) => ({
      ...prev,
      current_medications: prev.current_medications.filter((m) => m !== med),
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Patient Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Demographics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                min={1}
                max={120}
                value={formData.age}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, age: parseInt(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, gender: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="heart_rate">Heart Rate (bpm)</Label>
              <Input
                id="heart_rate"
                type="number"
                min={40}
                max={200}
                value={formData.heart_rate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    heart_rate: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blood_type">Blood Type</Label>
              <Select
                value={formData.blood_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, blood_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Symptoms */}
          <div className="space-y-2">
            <Label>Current Symptoms</Label>
            <div className="flex flex-wrap gap-2">
              {COMMON_SYMPTOMS.map((symptom) => (
                <Badge
                  key={symptom}
                  variant={formData.symptoms.includes(symptom) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleItem("symptoms", symptom)}
                >
                  {symptom}
                </Badge>
              ))}
            </div>
          </div>

          {/* Medical History */}
          <div className="space-y-2">
            <Label>Medical History</Label>
            <div className="flex flex-wrap gap-2">
              {COMMON_CONDITIONS.map((condition) => (
                <Badge
                  key={condition}
                  variant={
                    formData.medical_history.includes(condition) ? "default" : "outline"
                  }
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleItem("medical_history", condition)}
                >
                  {condition}
                </Badge>
              ))}
            </div>
          </div>

          {/* Allergies */}
          <div className="space-y-2">
            <Label>Known Allergies</Label>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map((allergy) => (
                <Badge
                  key={allergy}
                  variant={formData.allergies.includes(allergy) ? "destructive" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleItem("allergies", allergy)}
                >
                  {allergy}
                </Badge>
              ))}
            </div>
          </div>

          {/* Current Medications */}
          <div className="space-y-2">
            <Label>Current Medications</Label>
            <div className="flex gap-2">
              <Input
                value={newMedication}
                onChange={(e) => setNewMedication(e.target.value)}
                placeholder="Enter medication name"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMedication())}
              />
              <Button type="button" variant="outline" onClick={addMedication}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.current_medications.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.current_medications.map((med) => (
                  <Badge key={med} variant="secondary" className="gap-1">
                    {med}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeMedication(med)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Analyzing..." : "Get Drug Recommendations"}
          </Button>
          

        </form>
      </CardContent>
    </Card>
  );
};
