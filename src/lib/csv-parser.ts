import Papa from "papaparse";
import type { EHRRecord } from "@/types/drug-recommender";

export const parseCSV = (file: File): Promise<EHRRecord[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse<EHRRecord>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn("CSV parsing warnings:", results.errors);
        }
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

export const parseCSVFromText = (csvText: string): EHRRecord[] => {
  const result = Papa.parse<EHRRecord>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  return result.data;
};
