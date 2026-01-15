import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Pill, AlertTriangle, CheckCircle, Clock, Activity } from "lucide-react";
import { ShapChart } from "./ShapChart";
import type { PredictionResponse } from "@/types/drug-recommender";

interface RecommendationResultsProps {
  results: PredictionResponse;
}

export const RecommendationResults = ({ results }: RecommendationResultsProps) => {
  const { recommendations, explanations, interactions } = results;

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            No matching recommendations found. Try adjusting the patient information.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Drug Interactions Warning */}
      {interactions.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Drug Interactions Detected</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1">
              {interactions.map((interaction, i) => (
                <li key={i}>
                  <strong>{interaction.drug1}</strong> + <strong>{interaction.drug2}</strong>:{" "}
                  {interaction.description} (Severity: {interaction.severity})
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Recommended Medications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.map((rec, index) => (
            <div
              key={rec.name}
              className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    {index === 0 && <CheckCircle className="h-4 w-4 text-primary" />}
                    {rec.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    For: {rec.condition_match}
                  </p>
                </div>
                <Badge
                  variant={
                    rec.effectiveness === "High"
                      ? "default"
                      : rec.effectiveness === "Moderate"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {rec.effectiveness} Effectiveness
                </Badge>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Confidence</span>
                  <span>{rec.confidence}%</span>
                </div>
                <Progress value={rec.confidence} className="h-2" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-muted-foreground" />
                  <span>{rec.dosage}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{rec.frequency}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span>Side effects risk: {rec.side_effects_risk}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* SHAP Explanations */}
      <ShapChart explanations={explanations} />
    </div>
  );
};
