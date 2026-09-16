import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, Image as ImageIcon, Crop, Loader2, Sparkles } from "lucide-react";
import { ImageCropModal } from "./ImageCropModal.js";

interface ImageUploadProps {
  type: "avatar" | "wallpaper";
  currentUrl?: string | null;
  onUploadSuccess: (url: string) => void;
  label?: string;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  type,
  currentUrl,
  onUploadSuccess,
  label,
  className = "",
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);

  // Sync preview when currentUrl changes or loads asynchronously
  useEffect(() => {
    setPreview(currentUrl || null);
  }, [currentUrl]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkIsAnimated = (filenameOrUrl?: string | null, mime?: string) => {
    const str = (filenameOrUrl || "").toLowerCase();
    return str.endsWith(".webp") || str.endsWith(".gif") || mime === "image/gif" || mime === "image/webp";
  };

  const isAnimated = selectedFile
    ? checkIsAnimated(selectedFile.name, selectedFile.type)
    : checkIsAnimated(preview);

  const uploadFileOrBlob = async (fileOrBlob: Blob | File, customName?: string) => {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    const fileName =
      customName ||
      (fileOrBlob instanceof File
        ? fileOrBlob.name
        : selectedFile?.name || (type === "avatar" ? "avatar.webp" : "wallpaper.webp"));

    formData.append("image", fileOrBlob, fileName);

    try {
      const endpoint = type === "avatar" ? "/api/upload/avatar" : "/api/upload/wallpaper";
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Upload failed");
      }

      const data = await res.json();
      setPreview(data.url);
      onUploadSuccess(data.url);
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setSelectedFile(file);

    // Open crop modal with slidebar to adjust zoom and framing
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageForCrop(reader.result as string);
      setIsCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Clean One-Liner Header */}
      <div className="flex items-center justify-between gap-1.5 whitespace-nowrap min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {label && <label className="text-xs font-semibold text-slate-300 truncate">{label}</label>}
          {isAnimated && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 flex-shrink-0">
              <Sparkles className="w-2.5 h-2.5" /> Animated
            </span>
          )}
        </div>
        {preview && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRawImageForCrop(preview);
              setIsCropOpen(true);
            }}
            className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium flex-shrink-0 hover:underline"
            title="Adjust Crop & Framing"
          >
            <Crop className="w-3 h-3" /> Crop
          </button>
        )}
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        className={`relative overflow-hidden border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center group ${
          preview
            ? "border-brand-500/40 bg-dark-900/40 hover:border-brand-400"
            : "border-white/10 bg-dark-900/60 hover:border-white/20 hover:bg-dark-850"
        } ${
          type === "avatar"
            ? "w-24 h-24 sm:w-28 sm:h-28 rounded-full mx-auto"
            : "h-32 sm:h-36 w-full rounded-2xl"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.webp,.gif"
          onChange={handleChange}
          className="hidden"
        />

        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className={`absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs gap-1 backdrop-blur-xs ${
              type === "avatar" ? "rounded-full" : "rounded-2xl"
            }`}>
              <UploadCloud className="w-5 h-5" />
              <span className="text-[11px]">Change</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400 gap-1.5">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
            ) : (
              <UploadCloud className="w-6 h-6 group-hover:text-brand-400 transition-colors" />
            )}
            <span className="text-[11px] font-medium">
              {uploading ? "Uploading..." : `Upload ${type}`}
            </span>
          </div>
        )}
      </div>

      {error && <span className="text-[11px] text-red-400">{error}</span>}

      {/* Interactive Crop / Framing Modal */}
      {rawImageForCrop && (
        <ImageCropModal
          isOpen={isCropOpen}
          imageUrl={rawImageForCrop}
          type={type}
          isAnimated={isAnimated}
          onClose={() => setIsCropOpen(false)}
          onCropComplete={(blob) => uploadFileOrBlob(blob, selectedFile?.name)}
          onKeepOriginal={selectedFile ? () => {
            uploadFileOrBlob(selectedFile, selectedFile.name);
            setIsCropOpen(false);
          } : undefined}
        />
      )}
    </div>
  );
};
