"use client";

import React, { createContext, useContext, useState } from "react";
import type {
  ImageAnalysisResponse,
  RiskThresholds,
  VideoAnalysisResultsResponse,
} from "./types";

interface AnalysisContextValue {
  latestImageAnalysis: ImageAnalysisResponse | null;
  latestImagePreviewUrl: string | null;
  setImageAnalysis: (result: ImageAnalysisResponse, previewUrl: string) => void;
  latestVideoAnalysis: VideoAnalysisResultsResponse | null;
  setLatestVideoAnalysis: (result: VideoAnalysisResultsResponse) => void;
  thresholds: RiskThresholds;
  setThresholds: React.Dispatch<React.SetStateAction<RiskThresholds>>;
}

export const DEFAULT_THRESHOLDS: RiskThresholds = {
  overallModerate: 80,
  overallHigh: 200,
  regionalModerate: 15,
  regionalHigh: 35,
};

const AnalysisContext = createContext<AnalysisContextValue | undefined>(undefined);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [latestImageAnalysis, setLatestImageAnalysis] = useState<ImageAnalysisResponse | null>(null);
  const [latestImagePreviewUrl, setLatestImagePreviewUrl] = useState<string | null>(null);
  const [latestVideoAnalysis, setLatestVideoAnalysis] =
    useState<VideoAnalysisResultsResponse | null>(null);
  const [thresholds, setThresholds] = useState<RiskThresholds>(DEFAULT_THRESHOLDS);

  const setImageAnalysis = (result: ImageAnalysisResponse, previewUrl: string) => {
    setLatestImageAnalysis(result);
    setLatestImagePreviewUrl(previewUrl);
  };

  return (
    <AnalysisContext.Provider
      value={{
        latestImageAnalysis,
        latestImagePreviewUrl,
        setImageAnalysis,
        latestVideoAnalysis,
        setLatestVideoAnalysis,
        thresholds,
        setThresholds,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysisStore(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) {
    throw new Error("useAnalysisStore must be used inside AnalysisProvider");
  }
  return ctx;
}
