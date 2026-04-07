"use client";

import { useState, useRef } from "react";
import Webcam from "react-webcam";
import imageCompression from "browser-image-compression";

interface SmartCropCameraProps {
  label: string;
  overlayType: "ktp" | "paspor";
  onCapture: (imageData: { fileName: string; mimeType: string; data: string }) => void;
  required?: boolean;
  bannerImage?: string;
}

export default function SmartCropCamera({ label, overlayType, onCapture, required = false, bannerImage }: SmartCropCameraProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const webcamRef = useRef<Webcam>(null);
  const frameRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.9
      };

      const compressedBlob = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(",")[1];

        const imageData = {
          fileName: `${overlayType}_upload.jpg`,
          mimeType: "image/jpeg",
          data: base64Data,
        };

        setCapturedImage(base64String);
        onCapture(imageData);
        setShowCamera(false);
      };
      reader.readAsDataURL(compressedBlob);
    } catch (error) {
      console.error("Error processing uploaded image:", error);
      alert("Gagal memproses gambar. Silakan coba lagi.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCapture = async () => {
    if (!webcamRef.current) return;
    
    // Use the raw video element for smart cropping
    const video = webcamRef.current.video;
    if (!video || !frameRef.current) return;

    setIsProcessing(true);

    try {
      // 1. Calculate the actual rendered dimensions of the video due to object-cover
      const videoRect = video.getBoundingClientRect();
      const frameRect = frameRef.current.getBoundingClientRect();
      
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const videoRatio = videoWidth / videoHeight;
      const rectRatio = videoRect.width / videoRect.height;
      
      let scale;
      let renderOffsetX = 0;
      let renderOffsetY = 0;
      
      if (videoRatio > rectRatio) {
        // Video is wider than container, scaled by height
        scale = videoRect.height / videoHeight;
        renderOffsetX = (videoRect.width - (videoWidth * scale)) / 2;
      } else {
        // Video is taller than container, scaled by width
        scale = videoRect.width / videoWidth;
        renderOffsetY = (videoRect.height - (videoHeight * scale)) / 2;
      }
      
      // 2. Find the frame's position relative to the video element's top-left
      const frameX = frameRect.left - videoRect.left;
      const frameY = frameRect.top - videoRect.top;
      
      // 3. Convert screen coordinates to original video coordinates
      const sourceX = Math.max(0, (frameX - renderOffsetX) / scale);
      const sourceY = Math.max(0, (frameY - renderOffsetY) / scale);
      const sourceWidth = Math.min(videoWidth - sourceX, frameRect.width / scale);
      const sourceHeight = Math.min(videoHeight - sourceY, frameRect.height / scale);
      
      // 4. Draw the cropped area to a canvas
      const canvas = document.createElement('canvas');
      const targetWidth = 1024; // High quality output width for landscape
      // Since the crop is portrait, we swap proportions to make canvas landscape
      const targetHeight = (sourceWidth / sourceHeight) * targetWidth; 
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Rotate -90 degrees so the portrait crop becomes a proper landscape image
        ctx.translate(targetWidth / 2, targetHeight / 2);
        ctx.rotate(-90 * Math.PI / 180);
        ctx.drawImage(
          video,
          sourceX, sourceY, sourceWidth, sourceHeight,
          -targetHeight / 2, -targetWidth / 2, targetHeight, targetWidth
        );
      }
      
      // 5. Get the base64 from the canvas with maximum quality
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.95);
      const blob = await (await fetch(croppedBase64)).blob();
      const file = new File([blob], `${overlayType}_capture.jpg`, { type: "image/jpeg" });

      // Compress the cropped image to ensure small payload while maintaining document quality
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.9
      };

      const compressedBlob = await imageCompression(file, options);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(",")[1];

        const imageData = {
          fileName: `${overlayType}_capture.jpg`,
          mimeType: "image/jpeg",
          data: base64Data,
        };

        setCapturedImage(base64String);
        onCapture(imageData);
        setShowCamera(false);
      };
      reader.readAsDataURL(compressedBlob);
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Gagal memproses gambar. Silakan coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setShowCamera(true);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {bannerImage && (
        <div className="mb-4">
          <img src={bannerImage} alt={`Banner ${label}`} className="w-full rounded-lg" />
        </div>
      )}

      {!showCamera && !capturedImage && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Buka Kamera untuk {label}
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-500">atau</span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center disabled:bg-gray-400"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {isProcessing ? "Memproses..." : `Gunakan Kamera Native (Rekomendasi untuk ${overlayType.toUpperCase()})`}
          </button>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>💡 Tip:</strong> Gunakan "Kamera Native" untuk hasil yang lebih tajam dan autofocus otomatis, terutama di iPhone/Safari.
            </p>
          </div>
        </div>
      )}

      {showCamera && !capturedImage && (
        <div className="relative overflow-hidden rounded-xl bg-gray-900 border border-gray-200 shadow-inner h-[80vh] max-h-[800px] min-h-[500px]">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: "environment",
              width: { ideal: 3840, min: 1920 },
              height: { ideal: 2160, min: 1080 },
              aspectRatio: { ideal: 16/9 }
            }}
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* Overlay Guideline Frame */}
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center pb-24">
            <img 
              ref={frameRef}
              src={overlayType === "ktp" ? "/img/FRAME KTP.png" : "/img/FRAME PASPOR IDENTITAS.png"} 
              alt={`Frame ${overlayType}`}
              className="opacity-80 drop-shadow-2xl"
              style={{ 
                transform: 'rotate(90deg)', 
                width: 'min(78vh, 540px)' /* Diperbesar 20% dari 65vh, 450px */
              }}
            />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
            <div className="text-center text-white text-sm font-medium mb-3 drop-shadow-md">
              <p>Pastikan identitas terlihat jelas</p>
              <p>Gunakan pencahayaan yang cukup</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCapture}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition shadow-lg disabled:bg-gray-500 flex items-center justify-center"
              >
                {isProcessing ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Memproses...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Ambil Foto
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowCamera(false)}
                className="py-3 px-4 bg-gray-700 text-white font-medium rounded-xl hover:bg-gray-800 transition shadow-lg"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {capturedImage && (
        <div className="space-y-3">
          <img src={capturedImage} alt={`Captured ${label}`} className="w-full rounded-lg border-2 border-green-500" />
          <button
            type="button"
            onClick={handleRetake}
            className="w-full py-3 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            Ambil Ulang
          </button>
        </div>
      )}
    </div>
  );
}
