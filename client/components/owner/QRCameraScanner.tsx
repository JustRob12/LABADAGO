"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, X, RefreshCw, Upload, AlertCircle, CheckCircle2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface QRCameraScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
  incomingPasses?: Array<{ tracking_number: string; customer_name: string }>;
}

// Play pleasant register confirmation beep
function playScanBeep() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // High A5 pitch
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // AudioContext blocked or unsupported
  }
}

export const QRCameraScanner: React.FC<QRCameraScannerProps> = ({
  onScanSuccess,
  onClose,
  incomingPasses = [],
}) => {
  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let html5QrCode: any = null;

    async function startScanner() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        // Dynamically import html5-qrcode on client only
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (!isMounted) return;

        // Initialize dedicated QR engine with hardware acceleration where supported
        html5QrCode = new Html5Qrcode("qr-camera-feed", {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true, // Native browser C++ hardware decoder
          },
        });
        scannerRef.current = html5QrCode;

        // Query available camera devices safely
        const devices = await Html5Qrcode.getCameras().catch(() => []);
        if (devices && devices.length > 0) {
          setCameras(devices);
        }

        // Priority: Auto-select rear environment camera on phones/tablets if available
        let cameraIdOrConfig: any = { facingMode: { ideal: "environment" } };
        if (devices && devices.length > 0) {
          const rearCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("rear") ||
              d.label.toLowerCase().includes("environment")
          );
          if (currentCameraIndex === 0 && rearCam) {
            cameraIdOrConfig = rearCam.id;
          } else {
            cameraIdOrConfig = devices[currentCameraIndex % devices.length].id;
          }
        }

        await html5QrCode.start(
          cameraIdOrConfig,
          {
            fps: 20,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              // Generous 90% scanning area: detects QR codes anywhere in frame
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const edgeSize = Math.max(220, Math.floor(minEdge * 0.9));
              return { width: edgeSize, height: edgeSize };
            },
          },
          (decodedText: string) => {
            if (!isMounted || hasScanned) return;
            setHasScanned(true);
            playScanBeep();

            // Trigger success callback immediately
            onScanSuccess(decodedText);

            // Cleanly stop in background
            try {
              if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch(() => {});
              }
            } catch {
              // ignore
            }
          },
          () => {
            // Frame parse miss
          }
        );

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err: any) {
        console.warn("Camera start error:", err);
        if (isMounted) {
          setIsLoading(false);
          const msg =
            err?.message ||
            "Unable to access camera. Please allow camera permissions in your browser or select an incoming pass below.";
          setErrorMessage(msg);
        }
      }
    }

    startScanner();

    // Support pasting QR code image directly from clipboard
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            try {
              setIsLoading(true);
              const { Html5Qrcode } = await import("html5-qrcode");
              const fileScanner = new Html5Qrcode("qr-file-scan-temp");
              const result = await fileScanner.scanFile(file, true);
              playScanBeep();
              setHasScanned(true);
              onScanSuccess(result);
            } catch {
              setErrorMessage("Pasted image did not contain a recognizable QR code.");
            } finally {
              setIsLoading(false);
            }
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);

    return () => {
      isMounted = false;
      window.removeEventListener("paste", handlePaste);
      if (html5QrCode) {
        try {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().catch(() => {});
          }
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [currentCameraIndex]);

  // Flip / Switch Camera
  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        setCurrentCameraIndex((prev) => (prev + 1) % cameras.length);
      });
    } else {
      setCurrentCameraIndex((prev) => (prev + 1) % cameras.length);
    }
  };

  // Scan from photo or screenshot upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const { Html5Qrcode } = await import("html5-qrcode");
      const fileScanner = new Html5Qrcode("qr-file-scan-temp");
      const result = await fileScanner.scanFile(file, true);
      playScanBeep();
      setHasScanned(true);
      onScanSuccess(result);
    } catch {
      setErrorMessage("Could not detect a valid QR code in the uploaded image. Please try another image or point the live camera.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-700 shadow-2xl overflow-hidden animate-fadeIn">
      {/* Hidden container for image scan processing */}
      <div id="qr-file-scan-temp" className="hidden" />

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Camera size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              Live QR Camera Scanner
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </h4>
            <p className="text-[11px] text-slate-400">
              Point camera at the customer&apos;s phone screen pass
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close Camera Scanner"
        >
          <X size={18} />
        </button>
      </div>

      {/* Viewfinder Canvas Area */}
      <div className="mt-4 flex flex-col items-center justify-center">
        <div className="relative w-full max-w-xs sm:max-w-sm aspect-square bg-black rounded-2xl overflow-hidden border-2 border-slate-800 shadow-inner flex items-center justify-center">
          {/* HTML5 QR Code Mount Element */}
          <div id="qr-camera-feed" className="w-full h-full object-cover" />

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
              <RefreshCw size={24} className="animate-spin text-emerald-400" />
              <span className="text-xs text-slate-300 font-medium">Starting camera...</span>
            </div>
          )}

          {/* Success Flash */}
          {hasScanned && (
            <div className="absolute inset-0 bg-emerald-500/30 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-30 animate-pulse">
              <CheckCircle2 size={40} className="text-emerald-300" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">QR Code Verified!</span>
            </div>
          )}

          {/* Target Reticle Brackets (Camera HUD) */}
          <div className="absolute inset-8 pointer-events-none border border-white/20 rounded-xl">
            {/* Top-Left */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg" />
            {/* Top-Right */}
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg" />
            {/* Bottom-Left */}
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg" />
            {/* Bottom-Right */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-emerald-400 rounded-br-lg" />

            {/* Scanning Laser Animation */}
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,1)] animate-pulse" />
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-3 w-full max-w-sm p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Camera Access Notice</p>
              <p className="text-[11px] text-rose-300 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Scan Incoming Pass Chips (for instant 1-tap verification) */}
      {incomingPasses.length > 0 && (
        <div className="mt-3.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <span>⚡</span> Quick Tap to Scan Incoming Pass:
            </span>
            <span className="text-slate-400">{incomingPasses.length} pending</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {incomingPasses.map((pass) => (
              <button
                key={pass.tracking_number}
                type="button"
                onClick={() => {
                  playScanBeep();
                  setHasScanned(true);
                  onScanSuccess(pass.tracking_number);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all cursor-pointer"
                title={`Instantly verify and intake ${pass.tracking_number}`}
              >
                <span>✓</span>
                <span>{pass.tracking_number}</span>
                <span className="font-sans font-normal text-[11px] text-slate-400">({pass.customer_name})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Camera Toolbar */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {cameras.length > 1 && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Flip Camera ({cameras.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <Upload size={13} />
            <span>Upload Photo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer ml-auto"
        >
          Cancel & Enter Manually
        </button>
      </div>
    </div>
  );
};
