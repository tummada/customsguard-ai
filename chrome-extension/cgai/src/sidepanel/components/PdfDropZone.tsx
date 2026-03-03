import { useState, useRef, useCallback } from "react";
import { renderPdfToImages } from "@/lib/pdf-renderer";

interface PdfDropZoneProps {
  onPagesReady: (pages: string[], rawFile: File) => void;
  disabled?: boolean;
}

export default function PdfDropZone({ onPagesReady, disabled }: PdfDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        alert("กรุณาเลือกไฟล์ PDF เท่านั้น");
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
        alert("ไม่สามารถอ่านไฟล์ PDF ได้");
        setFileName(null);
      } finally {
        setRendering(false);
      }
    },
    [onPagesReady]
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
        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
        ${isDragging ? "border-amber-400 bg-amber-400/10" : "border-gray-700 hover:border-gray-500"}
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
        <div className="text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm">กำลังอ่าน PDF...</p>
        </div>
      ) : fileName ? (
        <div className="text-gray-300">
          <p className="text-sm font-medium">{fileName}</p>
          <p className="text-xs text-gray-500 mt-1">{pageCount} หน้า — คลิกเพื่อเปลี่ยนไฟล์</p>
        </div>
      ) : (
        <div className="text-gray-500">
          <p className="text-2xl mb-2">+</p>
          <p className="text-sm">ลากไฟล์ PDF มาวางที่นี่</p>
          <p className="text-xs mt-1">หรือคลิกเพื่อเลือกไฟล์</p>
        </div>
      )}
    </div>
  );
}
