import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  Move,
  Maximize2,
  Columns,
  Sparkles,
  Sliders,
  User,
} from "lucide-react";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  type?: "avatar" | "wallpaper";
  onCropComplete: (croppedBlob: Blob) => void;
  onKeepOriginal?: () => void;
  isAnimated?: boolean;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  type = "wallpaper",
  onCropComplete,
  onKeepOriginal,
  isAnimated = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fitMode, setFitMode] = useState<"fill" | "ambient">("ambient");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const canvasWidth = type === "avatar" ? 512 : 1280;
  const canvasHeight = type === "avatar" ? 512 : 720;

  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      imgRef.current = img;
      const isPortrait = img.naturalHeight > img.naturalWidth;
      setFitMode(isPortrait ? "ambient" : "fill");
      setZoom(1);
      setPan({ x: 0, y: 0 });
      drawCanvas(img, 1, { x: 0, y: 0 }, isPortrait ? "ambient" : "fill");
    };
  }, [isOpen, imageUrl, type]);

  const drawCanvas = (
    img: HTMLImageElement,
    currentZoom: number,
    currentPan: { x: number; y: number },
    mode: "fill" | "ambient"
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    if (type === "avatar") {
      // 1:1 Avatar Framing
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * currentZoom;
      const sw = img.naturalWidth * scale;
      const sh = img.naturalHeight * scale;
      const posX = (cw - sw) / 2 + currentPan.x;
      const posY = (ch - sh) / 2 + currentPan.y;

      ctx.save();
      ctx.fillStyle = "#090a0f";
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, posX, posY, sw, sh);
      ctx.restore();
    } else {
      // 16:9 Wallpaper Framing
      if (mode === "ambient") {
        // Ambient blurred background
        ctx.save();
        ctx.filter = "blur(20px) brightness(0.4)";
        ctx.drawImage(img, -20, -20, cw + 40, ch + 40);
        ctx.restore();

        // Centered sharp image with pan/zoom
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const targetHeight = ch * 0.92 * currentZoom;
        const targetWidth = targetHeight * imgAspect;
        const posX = (cw - targetWidth) / 2 + currentPan.x;
        const posY = (ch - targetHeight) / 2 + currentPan.y;

        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 30;
        ctx.drawImage(img, posX, posY, targetWidth, targetHeight);
        ctx.restore();
      } else {
        // Fill mode
        const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * currentZoom;
        const sw = img.naturalWidth * scale;
        const sh = img.naturalHeight * scale;
        const posX = (cw - sw) / 2 + currentPan.x;
        const posY = (ch - sh) / 2 + currentPan.y;

        ctx.save();
        ctx.fillStyle = "#090a0f";
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(img, posX, posY, sw, sh);
        ctx.restore();
      }
    }
  };

  useEffect(() => {
    if (imgRef.current) {
      drawCanvas(imgRef.current, zoom, pan, fitMode);
    }
  }, [zoom, pan, fitMode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Mobile / Touch Drag Support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
          onClose();
        }
      },
      "image/webp",
      0.95
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] glass-panel rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden bg-dark-950 my-auto">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between bg-dark-900/80 flex-shrink-0">
          <div>
            <h3 className="font-bold text-white text-base">
              {type === "avatar" ? "Avatar Framing & Crop Editor" : "Wallpaper Framing & Crop Editor"}
            </h3>
            <p className="text-xs text-slate-400">
              Drag to reposition, use the slidebar to zoom, or select framing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Animated WebP / GIF Notice */}
        {isAnimated && (
          <div className="px-4 py-2 bg-purple-950/70 border-b border-purple-500/30 flex items-center justify-between text-xs text-purple-200 flex-shrink-0">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>Animated WebP / GIF: Standard crop tools freeze moving images into a still frame.</span>
            </span>
            {onKeepOriginal && (
              <button
                type="button"
                onClick={onKeepOriginal}
                className="px-3 py-1 rounded-lg bg-purple-500/30 hover:bg-purple-500/50 text-purple-200 hover:text-white border border-purple-400/40 text-[11px] font-bold transition-colors ml-2"
              >
                Keep Moving Picture
              </button>
            )}
          </div>
        )}

        {/* Canvas Workspace (Bounded Height to Prevent Slidebar Clipping) */}
        <div
          className="relative bg-dark-950 flex items-center justify-center p-3 overflow-hidden select-none cursor-grab active:cursor-grabbing flex-shrink touch-none"
          style={{ height: type === "avatar" ? "240px" : "220px" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className={`relative ${type === "avatar" ? "w-[210px] h-[210px]" : "w-full max-w-[500px] h-full"}`}>
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="w-full h-full object-contain rounded-2xl border border-white/10 shadow-2xl"
            />
            {/* Circle guide overlay for avatar */}
            {type === "avatar" && (
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/40 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
            )}
          </div>

          <div className="absolute bottom-3 left-3 pointer-events-none bg-dark-950/80 px-2.5 py-1 rounded-lg border border-white/10 text-[11px] text-slate-400 flex items-center gap-1.5 backdrop-blur-md">
            <Move className="w-3.5 h-3.5" /> Drag to reposition
          </div>
        </div>

        {/* Dedicated Prominent Zoom & Crop Slidebar (Always Visible) */}
        <div className="px-5 py-2.5 bg-dark-900/90 border-t border-white/10 flex flex-col gap-1.5 flex-shrink-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <Sliders className="w-3.5 h-3.5 text-brand-400" />
              <span>Crop & Zoom Slidebar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-brand-300 bg-dark-950 px-2.5 py-0.5 rounded border border-white/10">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                title="Reset zoom to 100% and center"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>

          {/* Slidebar Input */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              id="crop-zoom-slidebar"
              type="range"
              min={0.5}
              max={3.0}
              step={0.02}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-brand-500 hover:accent-brand-400 transition-all"
            />
            <ZoomIn className="w-4 h-4 text-slate-400 flex-shrink-0" />
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 font-mono px-1 select-none">
            <span>50%</span>
            <span>100% (Fit)</span>
            <span>150%</span>
            <span>200%</span>
            <span>300%</span>
          </div>
        </div>

        {/* Footer Actions & Framing Toggle */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-dark-950 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          {/* Fit Mode Toggle for Wallpaper or Avatar Hint */}
          {type === "wallpaper" ? (
            <div className="flex items-center gap-1.5 bg-dark-900 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setFitMode("ambient");
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  fitMode === "ambient"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Fit portrait image centered with ambient blurred sides"
              >
                <Columns className="w-3.5 h-3.5" /> Ambient Fit
              </button>
              <button
                type="button"
                onClick={() => {
                  setFitMode("fill");
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  fitMode === "fill"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Fill entire widescreen (crops edges)"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Widescreen Fill
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <User className="w-3.5 h-3.5 text-brand-400" />
              <span>1:1 Profile Avatar Framing</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            {isAnimated && onKeepOriginal && (
              <button
                type="button"
                onClick={onKeepOriginal}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-500/25 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" /> Keep Moving Animation
              </button>
            )}
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-brand-500/25 transition-all hover:scale-105"
            >
              <Check className="w-4 h-4" /> {type === "avatar" ? "Apply Avatar" : "Apply Wallpaper"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

