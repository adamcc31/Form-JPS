"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useOpenCV } from "@/lib/useOpenCV";
import { Point, detectDocumentCorners, applyPerspectiveTransform, canvasToBlob, getBlurScore } from "@/lib/opencv-utils";

interface DocumentScannerProps {
  label: string;
  overlayType: "ktp" | "paspor";
  onCapture: (imageUrl: string) => void;
  required?: boolean;
  bannerImage?: string;
}

type Stage = "upload" | "detecting" | "adjusting" | "uploading" | "done";

// Handle radius — besar untuk jari di mobile (visual)
const HANDLE_RADIUS = 22;
// Hit-test radius — bahkan lebih besar supaya mudah dipilih
const HIT_RADIUS = 40;

export default function DocumentScanner({ label, overlayType, onCapture, required = false, bannerImage }: DocumentScannerProps) {
  const { loaded, error } = useOpenCV();
  
  const [stage, setStage] = useState<Stage>("upload");
  const [errorMessage, setErrorMessage] = useState("");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Image element untuk nyimpen gambar asli yang diupload user
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  
  // Posisi 4 sudut (TL, TR, BR, BL) di canvas (koordinat internal canvas)
  const [corners, setCorners] = useState<Point[]>([]);
  const [draggingPointIdx, setDraggingPointIdx] = useState<number | null>(null);
  const [displayScale, setDisplayScale] = useState(1);
  // Rasio antara CSS display size dan internal canvas size 
  // (canvas internal bisa berbeda dari CSS display jika max-width constrains it)
  const [cssScale, setCssScale] = useState(1);
  
  // Saat image dimuat, atau corners berubah → redraw
  useEffect(() => {
    if (stage === "adjusting" && sourceImg && canvasRef.current) {
      drawCanvas();
    }
  }, [corners, stage, sourceImg]);

  // Track CSS scale (saat canvas CSS width != canvas.width)
  useEffect(() => {
    if (stage !== "adjusting" || !canvasRef.current) return;
    
    const updateCssScale = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cssWidth = canvas.getBoundingClientRect().width;
      const internalWidth = canvas.width;
      if (internalWidth > 0) {
        setCssScale(cssWidth / internalWidth);
      }
    };
    
    updateCssScale();
    window.addEventListener("resize", updateCssScale);
    return () => window.removeEventListener("resize", updateCssScale);
  }, [stage, sourceImg]);

  const resetState = () => {
    setStage("upload");
    setErrorMessage("");
    setSourceImg(null);
    setCorners([]);
    setCapturedUrl(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!loaded) {
      setErrorMessage("OpenCV belum siap. Silahkan tunggu sebentar.");
      return;
    }

    setStage("detecting");
    setErrorMessage("");

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setSourceImg(img);
      processInitialDetection(img);
    };
    img.onerror = () => {
      setStage("upload");
      setErrorMessage("Format gambar tidak didukung.");
    };
    img.src = url;
  };

  const processInitialDetection = (img: HTMLImageElement) => {
    // Kita render ke display width (maks containerWidth)
    const containerWidth = Math.min(window.innerWidth - 48, 600); 
    const displayScl = containerWidth / img.width;
    setDisplayScale(displayScl);
    
    const cw = Math.round(img.width * displayScl);
    const ch = Math.round(img.height * displayScl);

    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = cw;
    tmpCanvas.height = ch;
    const tmpCtx = tmpCanvas.getContext("2d");
    if (tmpCtx) {
      tmpCtx.drawImage(img, 0, 0, cw, ch);
    }

    // Panggil utility OpenCV
    const detected = detectDocumentCorners(tmpCanvas);
    
    if (detected) {
      setCorners(detected);
    } else {
      // Default: box dgn margin 10%
      const m = 0.1;
      setCorners([
        { x: cw * m, y: ch * m },
        { x: cw * (1 - m), y: ch * m },
        { x: cw * (1 - m), y: ch * (1 - m) },
        { x: cw * m, y: ch * (1 - m) }
      ]);
    }
    
    setStage("adjusting");
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImg) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = Math.round(sourceImg.width * displayScale);
    const h = Math.round(sourceImg.height * displayScale);
    canvas.width = w;
    canvas.height = h;

    // Draw img
    ctx.drawImage(sourceImg, 0, 0, w, h);

    // Draw overlay semi transparent bg
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.fill();

    // Clear polygon
    if (corners.length === 4) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      ctx.lineTo(corners[1].x, corners[1].y);
      ctx.lineTo(corners[2].x, corners[2].y);
      ctx.lineTo(corners[3].x, corners[3].y);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      // Draw poly stroke
      ctx.strokeStyle = "#3b82f6"; // blue-500
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      ctx.lineTo(corners[1].x, corners[1].y);
      ctx.lineTo(corners[2].x, corners[2].y);
      ctx.lineTo(corners[3].x, corners[3].y);
      ctx.closePath();
      ctx.stroke();

      // Draw edge midpoints (visual cue - small dots)
      for (let i = 0; i < 4; i++) {
        const next = (i + 1) % 4;
        const mx = (corners[i].x + corners[next].x) / 2;
        const my = (corners[i].y + corners[next].y) / 2;
        ctx.beginPath();
        ctx.arc(mx, my, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(59, 130, 246, 0.6)";
        ctx.fill();
      }

      // Draw corner handles - large and visible
      corners.forEach((pt, idx) => {
        // Outer glow
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, HANDLE_RADIUS + 4, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
        ctx.fill();
        
        // Main handle
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, HANDLE_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = draggingPointIdx === idx ? "#2563eb" : "#3b82f6";
        ctx.fill();
        
        // White ring
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      });
    }
  };

  // Konversi posisi pointer (mouse/touch) dari CSS coords → canvas internal coords
  const getCanvasPos = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Hitung rasio CSS → canvas internal  
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const onPointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (stage !== "adjusting") return;
    e.preventDefault();
    e.stopPropagation();

    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const pos = getCanvasPos(clientX, clientY);
    
    // Cari dot terdekat yg kena hit — gunakan HIT_RADIUS yang besar
    let closestIdx = -1;
    let closestDist = Infinity;
    
    corners.forEach((pt, idx) => {
      const dx = pt.x - pos.x;
      const dy = pt.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= HIT_RADIUS && dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    if (closestIdx !== -1) {
      setDraggingPointIdx(closestIdx);
    }
  }, [stage, corners, getCanvasPos]);

  const onPointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (draggingPointIdx === null || stage !== "adjusting") return;
    e.preventDefault();
    e.stopPropagation();

    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const pos = getCanvasPos(clientX, clientY);
    
    setCorners((prev) => {
      const next = [...prev];
      // Clamp to canvas bounds
      const canvas = canvasRef.current;
      if (canvas) {
        pos.x = Math.max(0, Math.min(canvas.width, pos.x));
        pos.y = Math.max(0, Math.min(canvas.height, pos.y));
      }
      next[draggingPointIdx] = pos;
      return next;
    });
  }, [draggingPointIdx, stage, getCanvasPos]);

  const onPointerUp = useCallback(() => {
    setDraggingPointIdx(null);
  }, []);

  // Global event listeners for move/up to catch events outside canvas
  useEffect(() => {
    if (draggingPointIdx === null) return;
    
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      let clientX: number, clientY: number;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      const pos = getCanvasPos(clientX, clientY);
      setCorners((prev) => {
        const next = [...prev];
        const canvas = canvasRef.current;
        if (canvas) {
          pos.x = Math.max(0, Math.min(canvas.width, pos.x));
          pos.y = Math.max(0, Math.min(canvas.height, pos.y));
        }
        next[draggingPointIdx] = pos;
        return next;
      });
    };
    
    const handleGlobalUp = () => {
      setDraggingPointIdx(null);
    };
    
    window.addEventListener("mousemove", handleGlobalMove);
    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("touchmove", handleGlobalMove, { passive: false });
    window.addEventListener("touchend", handleGlobalUp);
    window.addEventListener("touchcancel", handleGlobalUp);
    
    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchmove", handleGlobalMove);
      window.removeEventListener("touchend", handleGlobalUp);
      window.removeEventListener("touchcancel", handleGlobalUp);
    };
  }, [draggingPointIdx, getCanvasPos]);

  const handleConfirmCrop = async () => {
    if (!sourceImg || corners.length !== 4) return;
    setStage("uploading");
    setErrorMessage("");

    try {
      // Scale corners back to original image size
      const origCorners = corners.map(pt => ({
        x: pt.x / displayScale,
        y: pt.y / displayScale
      }));

      // Render original image ke hidden canvas
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = sourceImg.width;
      srcCanvas.height = sourceImg.height;
      const srcCtx = srcCanvas.getContext("2d");
      if (!srcCtx) throw new Error("Gagal rendering konteks 2D");
      srcCtx.drawImage(sourceImg, 0, 0);

      // Hitung dimensi target sesuai rasio dokumen
      const ratio = overlayType === "ktp" ? 85.6 / 53.98 : 125 / 88;
      
      let dstWidth = 1200;
      let dstHeight = Math.round(dstWidth / ratio);
      
      const topWidth = Math.hypot(origCorners[0].x - origCorners[1].x, origCorners[0].y - origCorners[1].y);
      const leftHeight = Math.hypot(origCorners[0].x - origCorners[3].x, origCorners[0].y - origCorners[3].y);
      if (topWidth < leftHeight) {
        [dstWidth, dstHeight] = [dstHeight, dstWidth];
      }

      const warpedCanvas = applyPerspectiveTransform(srcCanvas, origCorners, dstWidth, dstHeight);
      
      // Ambil blur score
      const blurScore = getBlurScore(warpedCanvas);

      // Convert ke blob — gunakan JPEG karena didukung semua browser
      const blob = await canvasToBlob(warpedCanvas, 0.92);
      
      // Kirim via formulir POST ke /api/enhance-document
      const formData = new FormData();
      formData.append("file", blob, `${overlayType}_dokumen.jpg`);
      formData.append("blurScore", blurScore.toString());

      const res = await fetch("/api/enhance-document", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errorMsg = "Gagal mengunggah & mengenhance gambar";
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch { /* response bukan JSON */ }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      
      setCapturedUrl(data.url);
      setStage("done");
      onCapture(data.url);

    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat memproses gambar.");
      setStage("adjusting");
    }
  };

  return (
    <div className="space-y-4 bg-white p-4 sm:p-5 rounded-xl border border-gray-100 shadow-sm">
      <label className="block text-sm font-semibold text-gray-800">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {bannerImage && stage === "upload" && (
        <div className="mb-2">
          <img src={bannerImage} alt={`Banner ${label}`} className="w-full rounded-lg object-cover" />
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          Gagal memuat sistem pendeteksi gambar (OpenCV). Harap muat ulang halaman.
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-start">
          <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {stage === "upload" && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!loaded}
            className="w-full py-4 px-4 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 hover:border-blue-400 transition flex flex-col items-center justify-center space-y-2 group"
          >
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <span className="font-medium text-gray-700">{!loaded ? "Menyiapkan sistem..." : "Klik untuk Pilih / Ambil Foto"}</span>
            <span className="text-xs text-gray-500">Mendukung format JPG, PNG</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {stage === "detecting" && (
        <div className="py-12 flex flex-col items-center justify-center border rounded-xl bg-gray-50">
          <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p className="text-gray-600 font-medium">Menganalisis gambar...</p>
        </div>
      )}

      {stage === "adjusting" && (
        <div className="flex flex-col items-center space-y-4">
          <p className="text-sm text-gray-600 text-center w-full">
            Geser 4 titik sudut biru untuk menyesuaikan bentuk {label}.
          </p>
          <div 
            ref={containerRef}
            className="relative rounded-lg bg-gray-100 border select-none"
            style={{ width: "100%", touchAction: "none", WebkitUserSelect: "none", userSelect: "none" }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={onPointerDown}
              onTouchStart={onPointerDown}
              className="w-full block rounded-lg"
              style={{ touchAction: "none", WebkitTouchCallout: "none" }}
            />
          </div>
          <div className="flex w-full space-x-3">
            <button
              type="button"
              onClick={resetState}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition"
            >
              Ulangi
            </button>
            <button
              type="button"
              onClick={handleConfirmCrop}
              className="flex-1 py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition shadow-md"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      )}

      {stage === "uploading" && (
        <div className="py-12 flex flex-col items-center justify-center border rounded-xl bg-gray-50">
          <svg className="animate-spin h-8 w-8 text-green-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p className="text-gray-600 font-medium">Memproses & mengunggah kualitas tinggi...</p>
        </div>
      )}

      {stage === "done" && capturedUrl && (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border-2 border-green-400 bg-gray-50 p-1">
            <img src={capturedUrl} alt={`Captured ${label}`} className="w-full rounded-lg object-contain max-h-64" />
            <div className="absolute top-3 right-3 bg-green-500 text-white rounded-full p-1.5 shadow-md">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
          </div>
          <button
            type="button"
            onClick={resetState}
            className="w-full py-3 px-4 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition shadow-sm"
          >
            Ambil / Ganti Foto Lain
          </button>
        </div>
      )}
    </div>
  );
}
