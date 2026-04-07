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

  const handleCapture = async () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setIsProcessing(true);

    try {
      const base64Response = await fetch(imageSrc);
      const blob = await base64Response.blob();
      const file = new File([blob], `${overlayType}_capture.jpg`, { type: "image/jpeg" });

      const options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
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
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Buka Kamera untuk {label}
        </button>
      )}

      {showCamera && !capturedImage && (
        <div className="relative overflow-hidden rounded-xl bg-gray-900 border border-gray-200 shadow-inner">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: "environment", // Better to use environment for taking ID photos
            }}
            className="w-full h-auto object-cover"
          />
          
          {/* Overlay Guideline Frame */}
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <img 
              src={overlayType === "ktp" ? "/img/FRAME KTP.png" : "/img/FRAME PASPOR IDENTITAS.png"} 
              alt={`Frame ${overlayType}`}
              className="w-full h-full object-cover opacity-80"
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
