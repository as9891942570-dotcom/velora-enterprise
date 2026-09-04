"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { isDisplayableImageUrl, resolveImageUrl } from "@/lib/image-url";

interface ProductImageFieldProps {
  label?: string;
  existingUrl?: string | null;
  onFileChange: (file: File | null) => void;
}

export function ProductImageField({
  label = "Product Image",
  existingUrl,
  onFileChange,
}: ProductImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const existingValid = existingUrl && isDisplayableImageUrl(existingUrl);
  const existingResolved = existingValid ? resolveImageUrl(existingUrl) : null;
  const displayUrl = previewUrl ?? existingResolved;
  const hasInvalidExisting = existingUrl && !isDisplayableImageUrl(existingUrl);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    onFileChange(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  function clearSelection() {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>

      {displayUrl ? (
        <div className="relative mb-3 aspect-square max-w-xs overflow-hidden rounded-lg border border-border bg-secondary/30">
          <Image
            src={displayUrl}
            alt="Product preview"
            fill
            className="object-cover"
            sizes="320px"
            unoptimized={displayUrl.startsWith("blob:")}
          />
        </div>
      ) : (
        <div className="mb-3 flex aspect-square max-w-xs items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
          No image selected
        </div>
      )}

      {hasInvalidExisting && !selectedFile && (
        <p className="mb-2 text-sm text-amber-700 dark:text-amber-300">
          The saved image uses an invalid local file path. Please upload a new image.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="block w-full max-w-xs text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
        />
        {selectedFile && (
          <button
            type="button"
            onClick={clearSelection}
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            Clear selection
          </button>
        )}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        JPEG, PNG, WebP, or GIF — max 5 MB
      </p>
    </div>
  );
}
