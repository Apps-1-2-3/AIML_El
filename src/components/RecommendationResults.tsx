import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Pill, AlertTriangle, CheckCircle, Clock, Activity, Users, TrendingUp, TrendingDown } from "lucide-react";
import type { PredictionResponse } from "@/lib/api-client";

interface RecommendationResultsProps {
  results: PredictionResponse;
}

export const RecommendationResults = ({ results }: RecommendationResultsProps) => {
  const { recommendations, explanations, interactions, similar_patients_count } = results;

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

  const topDrug = recommendations[0];

  return (
    <div className="space-y-6">
      {/* Similar Patients Count */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <span className="font-medium">
            Found <span className="text-primary font-bold">{similar_patients_count}</span> similar patients in the dataset
          </span>
        </CardContent>
      </Card>

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

      {/* Top Recommendation Highlight */}
      <Card className="border-2 border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-primary">
            <CheckCircle className="h-5 w-5" />
            Top Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold">{topDrug.name}</h3>
              <p className="text-muted-foreground">For: {topDrug.condition_match}</p>
            </div>
            <Badge variant="default" className="text-lg px-3 py-1">
              {topDrug.confidence}% Match
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-muted-foreground" />
              <span>{topDrug.dosage}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{topDrug.frequency}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span>{topDrug.effectiveness} effectiveness</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span>{topDrug.side_effects_risk} side effects</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SHAP Explanations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            SHAP Feature Explanations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            These features influenced the recommendation. Green = supports recommendation, Red = reduces confidence.
          </p>
          <div className="space-y-3">
            {explanations.map((exp, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {exp.direction === "positive" ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium truncate">{exp.feature}</span>
                    <span
                      className={`text-xs font-mono ${
                        exp.direction === "positive" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {exp.direction === "positive" ? "+" : "-"}
                      {(exp.influence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, exp.influence * 1000)}
                    className={`h-2 ${
                      exp.direction === "positive"
                        ? "[&>div]:bg-green-500"
                        : "[&>div]:bg-red-500"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Other Recommendations */}
      {recommendations.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Alternative Medications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.slice(1).map((rec) => (
              <div
                key={rec.name}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{rec.name}</h3>
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
                    {rec.effectiveness}
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
                    <span>Side effects: {rec.side_effects_risk}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
