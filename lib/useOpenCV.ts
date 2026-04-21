"use client";

import { useState, useEffect } from "react";

declare global {
  interface Window {
    cv: any;
    onOpenCvReady: () => void;
  }
}

let isLoading = false;
let isReady = false;

export function useOpenCV() {
  const [loaded, setLoaded] = useState(isReady);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isReady) {
      setLoaded(true);
      return;
    }

    if (isLoading) {
      // If currently loading, set up an interval to check when it's done
      const checkInterval = setInterval(() => {
        if (isReady) {
          setLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    isLoading = true;

    // Define the global callback
    window.onOpenCvReady = () => {
      isReady = true;
      isLoading = false;
      setLoaded(true);
    };

    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.8.0/opencv.js";
    script.async = true;
    script.type = "text/javascript";

    // OpenCV.js calls a function when it's ready, but checking for load is also good.
    script.onload = () => {
      // Sometimes OpenCV.js doesn't call the callback if it was already initialized, 
      // but waiting for 'cv' object to have its initialized methods is sufficient.
      const checkCv = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          isReady = true;
          isLoading = false;
          setLoaded(true);
          clearInterval(checkCv);
        }
      }, 100);
    };

    script.onerror = () => {
      isLoading = false;
      setError(true);
    };

    document.head.appendChild(script);

    return () => {
      // We don't remove the script to maintain the singleton across unmounts
    };
  }, []);

  return { loaded, error, cv: (typeof window !== "undefined" && window.cv) || null };
}
