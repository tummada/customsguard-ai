import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Upload, FileText } from "lucide-react";
import { renderPdfToImages } from "@/lib/pdf-renderer";

interface PdfDropZoneProps {
  onPagesReady: (pages: string[], rawFile: File) => void;
  disabled?: boolean;
}

export default function PdfDropZone({ onPagesReady, disabled }: PdfDropZoneProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        alert(t("scan.pdfOnly"));
        return;
      }

      setFileName(file.name);
      setRendering(true);

      try {
        const buffer = await file.arrayBuffer();
        const pages = await renderPdfToImages(buffer);
        setPageCount(pages.length);
        onPagesReady(pages, file);
      } catch (err) {
        console.error("[VOLLOS] PDF render error:", err);
        alert(t("scan.pdfReadError"));
        setFileName(null);
      } finally {
        setRendering(false);
      }
    },
    [onPagesReady, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [disabled, processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && !rendering && fileInputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
        ${isDragging ? "border-brand bg-brand/5" : "border-gray-200 hover:border-brand/30"}
        ${disabled || rendering ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {rendering ? (
        <div className="text-gray-500">
          <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm">{t("scan.readingPdf")}</p>
        </div>
      ) : fileName ? (
        <div className="text-gray-700">
          <FileText className="w-6 h-6 text-brand mx-auto mb-1" />
          <p className="text-sm font-medium">{fileName}</p>
          <p className="text-xs text-gray-500 mt-1">
            {pageCount} {t("scan.pages")} — {t("scan.clickToChange")}
          </p>
        </div>
      ) : (
        <div className="text-gray-500">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm">{t("scan.dropPdf")}</p>
          <p className="text-xs mt-1">{t("scan.orClick")}</p>
        </div>
      )}
    </div>
  );
}
