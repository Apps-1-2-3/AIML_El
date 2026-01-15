import { useState } from "react";
import { CSVUploader } from "@/components/CSVUploader";
import { PatientForm } from "@/components/PatientForm";
import { RecommendationResults } from "@/components/RecommendationResults";
import { useEHRData } from "@/hooks/useEHRData";
import { predictDrugs } from "@/lib/drug-recommender";
import type { PatientInput, PredictionResponse } from "@/types/drug-recommender";
import { Separator } from "@/components/ui/separator";
import { Activity } from "lucide-react";

const Index = () => {
  const { data, isLoading, error, fileName, loadCSV, clearData, recordCount } = useEHRData();
  const [results, setResults] = useState<PredictionResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const handlePredict = (patient: PatientInput) => {
    setIsPredicting(true);
    
    // Simulate processing time for better UX
    setTimeout(() => {
      const prediction = predictDrugs(patient, data);
      setResults(prediction);
      setIsPredicting(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Drug Recommendation System
              </h1>
              <p className="text-sm text-muted-foreground">
                AI-powered medication suggestions with explainable insights
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Input */}
          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-3">1. Load Dataset</h2>
              <CSVUploader
                onFileSelect={loadCSV}
                fileName={fileName}
                recordCount={recordCount}
                isLoading={isLoading}
                error={error}
                onClear={clearData}
              />
            </section>

            <Separator />

            <section>
              <h2 className="text-lg font-semibold mb-3">2. Enter Patient Data</h2>
              <PatientForm
                onSubmit={handlePredict}
                isLoading={isPredicting}
                disabled={recordCount === 0}
              />
            </section>
          </div>

          {/* Right Column - Results */}
          <div>
            <h2 className="text-lg font-semibold mb-3">3. Recommendations</h2>
            {results ? (
              <RecommendationResults results={results} />
            ) : (
              <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground text-center">
                  Submit patient information to see<br />drug recommendations
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
