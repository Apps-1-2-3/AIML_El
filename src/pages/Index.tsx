import { useState, useEffect, useCallback } from "react";
import { CSVUploader } from "@/components/CSVUploader";
import { PatientForm } from "@/components/PatientForm";
import { RecommendationResults } from "@/components/RecommendationResults";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Activity, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  checkApiHealth,
  uploadCSV,
  predictDrugs,
  getDataStatus,
  type PatientInput,
  type PredictionResponse,
} from "@/lib/api-client";

const Index = () => {
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [isCheckingApi, setIsCheckingApi] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [recordCount, setRecordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PredictionResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Check API connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      setIsCheckingApi(true);
      const connected = await checkApiHealth();
      setApiConnected(connected);
      setIsCheckingApi(false);

      if (connected) {
        // Check if data is already loaded
        try {
          const status = await getDataStatus();
          if (status.loaded) {
            setRecordCount(status.record_count);
            setFileName("Previously loaded data");
          }
        } catch {
          // Ignore errors
        }
      }
    };

    checkConnection();
    // Re-check every 5 seconds if not connected
    const interval = setInterval(() => {
      if (!apiConnected) {
        checkConnection();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [apiConnected]);

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await uploadCSV(file);
      setFileName(file.name);
      setRecordCount(response.record_count);
      setResults(null); // Clear previous results
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload CSV");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = () => {
    setFileName(null);
    setRecordCount(0);
    setResults(null);
    setError(null);
  };

  const handlePredict = useCallback(
    async (patient: PatientInput) => {
      if (recordCount === 0) return;

      setIsPredicting(true);
      setError(null);

      try {
        const prediction = await predictDrugs(patient);
        setResults(prediction);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get predictions");
      } finally {
        setIsPredicting(false);
      }
    },
    [recordCount]
  );

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
                AI-powered medication suggestions with SHAP explanations
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* API Connection Status */}
        {isCheckingApi ? (
          <Alert className="mb-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Connecting to Backend</AlertTitle>
            <AlertDescription>
              Checking connection to FastAPI backend at localhost:8000...
            </AlertDescription>
          </Alert>
        ) : !apiConnected ? (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Backend Not Connected</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                The Python FastAPI backend is not running. Please start it:
              </p>
              <code className="block bg-muted p-2 rounded text-sm">
                cd backend && pip install -r requirements.txt && python main.py
              </code>
              <p className="mt-2 text-sm">Retrying connection every 5 seconds...</p>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6 border-green-500/50 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-700 dark:text-green-400">
              Backend Connected
            </AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-500">
              FastAPI backend is running at localhost:8000
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Input */}
          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-3">1. Load EHR Dataset</h2>
              <CSVUploader
                onFileSelect={handleFileUpload}
                fileName={fileName}
                recordCount={recordCount}
                isLoading={isLoading}
                error={error}
                onClear={handleClearData}
                disabled={!apiConnected}
              />
            </section>

            <Separator />

            <section>
              <h2 className="text-lg font-semibold mb-3">2. Enter Patient Data</h2>
              <PatientForm
                onSubmit={handlePredict}
                isLoading={isPredicting}
                disabled={recordCount === 0 || !apiConnected}
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
                  {!apiConnected
                    ? "Start the backend to begin"
                    : recordCount === 0
                    ? "Upload EHR data first"
                    : "Submit patient information to see\ndrug recommendations"}
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
