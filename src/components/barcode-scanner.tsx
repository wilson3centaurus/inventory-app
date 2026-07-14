'use client';

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Camera, Keyboard, ScanLine, X } from "lucide-react";

type Detector = { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> };
type DetectorConstructor = new (options?: { formats?: string[] }) => Detector;

export function BarcodeScanner({ open, onClose, onCapture }: { open: boolean; onClose: () => void; onCapture: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState("");
  const [message, setMessage] = useState("Point the camera at a barcode");
  const handleDetected = useEffectEvent((code: string) => {
    onCapture(code);
    onClose();
  });

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    let frame = 0;
    let stream: MediaStream | null = null;

    const start = async () => {
      const DetectorClass = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
      if (!DetectorClass) {
        setMessage("Camera scanning is not supported here. Enter the code below.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!videoRef.current || stopped) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new DetectorClass({ formats: ["ean_13", "ean_8", "code_128", "qr_code", "upc_a", "upc_e"] });
        const scan = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) {
              handleDetected(codes[0].rawValue);
              return;
            }
          } catch { /* The video may not have a decoded frame yet. */ }
          frame = requestAnimationFrame(scan);
        };
        frame = requestAnimationFrame(scan);
      } catch {
        setMessage("Camera access was unavailable. Enter the code below.");
      }
    };
    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-primary/55 p-2 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Scan a barcode">
      <div className="w-full overflow-hidden rounded-[26px] bg-surface p-3 shadow-2xl sm:max-w-md">
        <div className="flex items-center justify-between px-1 pb-3"><div><p className="eyebrow">Camera capture</p><h2 className="mt-1 text-base font-extrabold">Scan barcode or QR</h2></div><button aria-label="Close scanner" type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl bg-surface-strong"><X className="size-4" /></button></div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-primary">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-[18%_10%] rounded-2xl border-2 border-accent shadow-[0_0_0_999px_rgba(14,45,38,.35)]"><ScanLine className="absolute -right-3 -top-3 size-6 rounded-lg bg-accent p-1 text-primary" /></div>
          <div className="absolute inset-x-3 bottom-3 rounded-xl bg-primary/75 px-3 py-2 text-center text-[10px] text-white backdrop-blur"><Camera className="mr-1 inline size-3" /> {message}</div>
        </div>
        <div className="mt-3 flex gap-2"><div className="relative flex-1"><Keyboard className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input aria-label="Barcode" className="field w-full rounded-[14px] pl-9 pr-3 text-sm" placeholder="Enter code manually" value={manual} onChange={(event) => setManual(event.target.value)} /></div><button type="button" disabled={!manual.trim()} onClick={() => { onCapture(manual.trim()); onClose(); }} className="primary-button px-4 text-xs">Use code</button></div>
      </div>
    </div>
  );
}
