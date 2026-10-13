'use client';

import { useState } from 'react';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { apiDownload, ApiError } from '@/lib/api';

interface ExportButtonsProps {
  /** API path WITHOUT the export query param, e.g. '/reports/summary' or '/reports/by-branch?year=2026' */
  path: string;
  filenamePrefix: string;
}

export default function ExportButtons({ path, filenamePrefix }: ExportButtonsProps) {
  const [downloading, setDownloading] = useState<'pdf' | 'xlsx' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(kind: 'pdf' | 'xlsx') {
    setDownloading(kind);
    setError(null);
    const separator = path.includes('?') ? '&' : '?';
    try {
      await apiDownload(`${path}${separator}export=${kind}`, `${filenamePrefix}.${kind}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Download failed.');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => handleExport('pdf')}
        disabled={downloading !== null}
        className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:py-1.5"
      >
        {downloading === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
        PDF
      </button>
      <button
        type="button"
        onClick={() => handleExport('xlsx')}
        disabled={downloading !== null}
        className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:py-1.5"
      >
        {downloading === 'xlsx' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
        Excel
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
