"use client";

import React, { useState, useRef, useEffect } from "react";
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

const MAGNIFIER_RADIUS = 15;

export default function DocumentScanner({ label, overlayType, onCapture, required = false, bannerImage }: DocumentScannerProps) {
  const { loaded, error } = useOpenCV();
  
  const [stage, setStage] = useState<Stage>("upload");
  const [errorMessage, setErrorMessage] = useState("");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Image element untuk nyimpen gambar asli yang diupload user
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  
  // Posisi 4 sudut (TL, TR, BR, BL) di canvas (koordinat ditampilkan)
  const [corners, setCorners] = useState<Point[]>([]);
  const [draggingPointIdx, setDraggingPointIdx] = useState<number | null>(null);
  const [displayScale, setDisplayScale] = useState(1);
  
  // Saat image dimuat
  useEffect(() => {
    if (stage === "adjusting" && sourceImg && canvasRef.current) {
      drawCanvas();
    }
  }, [corners, stage, sourceImg]);

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
    // Buat offscreen canvas max 1000px supaya deteksi tidak terlalu berat
    const maxDim = 1000;
    let scale = 1;
    if (img.width > maxDim || img.height > maxDim) {
      scale = maxDim / Math.max(img.width, img.height);
    }

    const tempW = img.width * scale;
    const tempH = img.height * scale;
    
    // Scale yg dipakai utk display menyesuaikan container 
    // tapi corner disave pakai coordinate relatif thd original image or display?
    // Lebih mudah corner relatif thd canvas yg dirender.
    
    // Kita render ke display width (maks containerWidth)
    const containerWidth = Math.min(window.innerWidth - 64, 600); 
    const displayScl = containerWidth / img.width;
    setDisplayScale(displayScl);
    
    const cw = img.width * displayScl;
    const ch = img.height * displayScl;

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

    const w = sourceImg.width * displayScale;
    const h = sourceImg.height * displayScale;
    canvas.width = w;
    canvas.height = h;

    // Draw img
    ctx.drawImage(sourceImg, 0, 0, w, h);

    // Draw overlay semi transparent bg
    ctx.fillStyle = "rgba(0,0,0,0.5)";
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
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw corners
      corners.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, MAGNIFIER_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = "#3b82f6"; // blue-500
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      });
    }
  };

  const getEventPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (stage !== "adjusting") return;
    const pos = getEventPos(e);
    // Cari dot terdekat yg kena hit
    const hitIndex = corners.findIndex(pt => {
      const dx = pt.x - pos.x;
      const dy = pt.y - pos.y;
      return Math.sqrt(dx * dx + dy * dy) <= MAGNIFIER_RADIUS * 2;
    });

    if (hitIndex !== -1) {
      setDraggingPointIdx(hitIndex);
    }
  };

  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (draggingPointIdx === null || stage !== "adjusting") return;
    if (e.cancelable && e.type !== "mousemove") {
      e.preventDefault();
    }
    
    const pos = getEventPos(e);
    setCorners((prev) => {
      const next = [...prev];
      next[draggingPointIdx] = pos;
      return next;
    });
  };

  const onPointerUp = () => {
    setDraggingPointIdx(null);
  };

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
      // KTP = ~85.6mm x 53.98mm => landscape
      // Paspor = ~125mm x 88mm => portrait (tergantung orientasi scan, kita pakai asumsi default landscape)
      // Gunakan resolusi yg wajar, toh server nanti resize ke 2400 max
      const ratio = overlayType === "ktp" ? 85.6 / 53.98 : 125 / 88;
      
      // Ambil ukuran terpanjang dari dokumen sebagai basis lebar (w)
      let dstWidth = 1200;
      let dstHeight = dstWidth / ratio;
      // Jika dokumen dipasang berdiri di HP (portrait)
      // Coba tentukan dari jarak X corners
      const topWidth = Math.hypot(origCorners[0].x - origCorners[1].x, origCorners[0].y - origCorners[1].y);
      const leftHeight = Math.hypot(origCorners[0].x - origCorners[3].x, origCorners[0].y - origCorners[3].y);
      if (topWidth < leftHeight) {
        // Document is portrait, flip our target dims
        [dstWidth, dstHeight] = [dstHeight, dstWidth];
      }

      const warpedCanvas = applyPerspectiveTransform(srcCanvas, origCorners, dstWidth, dstHeight);
      
      // Ambil blur score untuk dikirim (sistem kita di route bs ambil keputusan)
      const blurScore = getBlurScore(warpedCanvas);

      // Convert ke blob
      const blob = await canvasToBlob(warpedCanvas, 0.95);
      
      // Kirim via formulir POST ke /api/enhance-document
      const formData = new FormData();
      formData.append("file", blob, `${overlayType}_dokumen.webp`);
      formData.append("blurScore", blurScore.toString());

      const res = await fetch("/api/enhance-document", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal menggunggah & mengenhance gambar");
      }

      const data = await res.json();
      
      setCapturedUrl(data.url);
      setStage("done");
      onCapture(data.url);

    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat memproses gambar.");
      setStage("adjusting"); // kembalikan ke menyesuaikan agar bisa dicoba lg
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
            className="relative overflow-hidden rounded-lg bg-gray-100 border touch-none user-select-none"
            style={{ width: "fit-content", margin: "0 auto" }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={onPointerDown}
              onMouseMove={onPointerMove}
              onMouseUp={onPointerUp}
              onMouseLeave={onPointerUp}
              onTouchStart={onPointerDown}
              onTouchMove={onPointerMove}
              onTouchEnd={onPointerUp}
              onTouchCancel={onPointerUp}
              className="max-w-full block"
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
