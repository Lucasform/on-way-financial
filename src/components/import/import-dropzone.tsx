"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileUp, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

interface ImportDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function ImportDropzone({ onFile, disabled }: ImportDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      const first = accepted[0];
      if (first) onFile(first);
    },
    [onFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/pdf": [".pdf"],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-border bg-bg-elev hover:border-border-strong hover:bg-bg-elev-2",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input {...getInputProps()} />
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
        {isDragActive ? <FileUp className="h-7 w-7" /> : <Upload className="h-7 w-7" />}
      </div>
      <div>
        <p className="text-base font-semibold">
          {isDragActive ? "Solta o arquivo aqui" : "Arrasta um arquivo ou clica pra escolher"}
        </p>
        <p className="mt-1 text-xs text-text-muted">PDF, XLSX, XLS ou CSV · até 5 MB</p>
      </div>
    </div>
  );
}
