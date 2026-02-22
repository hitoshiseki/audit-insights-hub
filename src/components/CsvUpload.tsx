import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

interface CsvUploadProps {
  onFileLoaded: (file: File) => void;
  isLoading: boolean;
  fileName: string;
  error: string | null;
}

export function CsvUpload({ onFileLoaded, isLoading, fileName, error }: CsvUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv")) {
        return;
      }
      onFileLoaded(file);
    },
    [onFileLoaded]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  if (fileName && !error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-accent/50 px-3 py-2 text-sm">
        <FileText className="h-4 w-4 text-primary" />
        <span className="truncate max-w-[200px] text-foreground">{fileName}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3 w-3" />
        </Button>
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={onInputChange} />
      </div>
    );
  }

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          "cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all",
          isDragging
            ? "border-primary bg-accent/50"
            : "border-border hover:border-primary/50 hover:bg-accent/30"
        )}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Processando CSV...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Arraste um arquivo CSV ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground">Apenas arquivos .csv são aceitos</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={onInputChange} />
      </div>
      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}
