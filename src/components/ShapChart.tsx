import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import type { ShapExplanation } from "@/types/drug-recommender";

interface ShapChartProps {
  explanations: ShapExplanation[];
}

export const ShapChart = ({ explanations }: ShapChartProps) => {
  const data = explanations.map((exp) => ({
    feature: exp.feature,
    influence: exp.direction === "positive" ? exp.influence : -exp.influence,
    direction: exp.direction,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Feature Importance (SHAP-like Analysis)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
              <XAxis type="number" domain={[-1, 1]} tickFormatter={(v) => v.toFixed(1)} />
              <YAxis type="category" dataKey="feature" width={80} />
              <Tooltip
                formatter={(value: number) => [
                  `${Math.abs(value).toFixed(2)} (${value >= 0 ? "positive" : "negative"})`,
                  "Influence",
                ]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="influence" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.influence >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Positive values (blue) increase recommendation confidence. 
          Negative values (red) indicate factors requiring caution.
        </p>
      </CardContent>
    </Card>
  );
};
