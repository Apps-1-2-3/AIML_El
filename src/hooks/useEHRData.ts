import { useState, useCallback } from "react";
import { parseCSV } from "@/lib/csv-parser";
import type { EHRRecord } from "@/types/drug-recommender";

export const useEHRData = () => {
  const [data, setData] = useState<EHRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const loadCSV = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const records = await parseCSV(file);
      setData(records);
      setFileName(file.name);
      console.log(`Loaded ${records.length} EHR records from ${file.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse CSV";
      setError(message);
      console.error("CSV parsing error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData([]);
    setFileName(null);
    setError(null);
  }, []);

  return {
    data,
    isLoading,
    error,
    fileName,
    loadCSV,
    clearData,
    recordCount: data.length,
  };
};
