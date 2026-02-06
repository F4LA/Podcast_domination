"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  className?: string;
}

export function ExportButton({ className }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<"full" | "summary" | "touches" | "campaigns">("full");

  const handleExport = async (format: "csv" | "json" = "csv") => {
    setIsExporting(true);
    
    try {
      const response = await fetch(`/api/analytics/export?type=${exportType}&format=${format}`);
      
      if (!response.ok) {
        throw new Error("Export failed");
      }

      if (format === "json") {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        downloadBlob(blob, `outreach-${exportType}-${getDateString()}.json`);
      } else {
        const blob = await response.blob();
        downloadBlob(blob, `outreach-${exportType}-${getDateString()}.csv`);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getDateString = () => {
    return new Date().toISOString().split("T")[0];
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <select
        value={exportType}
        onChange={(e) => setExportType(e.target.value as typeof exportType)}
        className="h-8 rounded-md border border-[#c5c8d4] bg-white px-2 text-sm text-[#2D3142] focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20 focus:border-[#EF8354] transition-all duration-200 hover:border-[#EF8354]"
      >
        <option value="full">Full Export</option>
        <option value="summary">Summary Only</option>
        <option value="touches">Email History</option>
        <option value="campaigns">Campaigns</option>
      </select>

      <Button
        onClick={() => handleExport("csv")}
        disabled={isExporting}
        variant="outline"
        size="sm"
        className="h-8 px-3"
      >
        {isExporting ? (
          <>
            <svg className="mr-1.5 h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg
              className="mr-1.5 h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export CSV
          </>
        )}
      </Button>

      <Button
        onClick={() => handleExport("json")}
        disabled={isExporting}
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-[#5d637e] hover:text-[#2D3142] hover:bg-[#ecedf1]"
      >
        JSON
      </Button>
    </div>
  );
}


