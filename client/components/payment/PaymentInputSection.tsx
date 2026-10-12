"use client";

import React, { useRef } from "react";
import { Banknote, Smartphone, Camera, Upload, Trash2, FileText, CheckCircle2 } from "lucide-react";

export interface PaymentInputSectionProps {
  method: "Cash" | "GCash";
  onMethodChange: (m: "Cash" | "GCash") => void;
  referenceNo: string;
  onReferenceNoChange: (ref: string) => void;
  selectedFile: File | null;
  previewUrl: string | null;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  amount: number;
  theme?: "dark" | "light";
}

export const PaymentInputSection: React.FC<PaymentInputSectionProps> = ({
  method,
  onMethodChange,
  referenceNo,
  onReferenceNoChange,
  selectedFile,
  previewUrl,
  onFileSelect,
  onFileClear,
  amount,
  theme = "dark",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === "dark";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onFileSelect(file);
    }
  };

  return (
    <div
      className={`rounded-xl border p-3.5 sm:p-4 space-y-3 transition-all ${
        isDark
          ? "bg-slate-900/90 border-slate-700/80 text-slate-100"
          : "bg-slate-50/90 border-slate-200 text-slate-900"
      }`}
    >
      {/* Method Selection Tabs */}
      <div>
        <label
          className={`text-[11px] font-bold block mb-1.5 ${
            isDark ? "text-slate-300" : "text-slate-700"
          }`}
        >
          Payment Method for ₱{amount.toFixed(2)}:
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onMethodChange("Cash")}
            className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[42px] ${
              method === "Cash"
                ? isDark
                  ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500"
                  : "bg-emerald-100/90 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500"
                : isDark
                ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            <Banknote size={16} className={method === "Cash" ? "text-emerald-500" : ""} />
            <span>Cash (OTC)</span>
          </button>

          <button
            type="button"
            onClick={() => onMethodChange("GCash")}
            className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[42px] ${
              method === "GCash"
                ? isDark
                  ? "bg-blue-950/80 border-blue-500 text-blue-300 ring-1 ring-blue-500"
                  : "bg-blue-100/90 border-blue-500 text-blue-900 ring-1 ring-blue-500"
                : isDark
                ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            <Smartphone size={16} className={method === "GCash" ? "text-blue-500" : ""} />
            <span>GCash / Bank</span>
          </button>
        </div>
      </div>

      {/* Cash Info Hint */}
      {method === "Cash" && (
        <div
          className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
            isDark
              ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-300"
              : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}
        >
          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
          <span className="text-[11px] leading-tight">
            Customer pays <b>₱{amount.toFixed(2)}</b> in cash at counter.
          </span>
        </div>
      )}

      {/* GCash Inputs & Proof Upload */}
      {method === "GCash" && (
        <div className="space-y-2.5 pt-0.5">
          {/* Reference Number */}
          <div>
            <label
              className={`text-[11px] font-bold block mb-1 ${
                isDark ? "text-slate-300" : "text-slate-700"
              }`}
            >
              GCash Reference # <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 1029 3847 5510"
              value={referenceNo}
              onChange={(e) => onReferenceNoChange(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg text-xs font-mono border focus:outline-hidden ${
                isDark
                  ? "bg-slate-950 border-slate-700 text-white placeholder-slate-600 focus:border-blue-500"
                  : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500"
              }`}
            />
          </div>

          {/* Photo / Screenshot Upload Area */}
          <div>
            <label
              className={`text-[11px] font-bold block mb-1.5 ${
                isDark ? "text-slate-300" : "text-slate-700"
              }`}
            >
              Capture Receipt or Upload Screenshot:
            </label>

            {previewUrl ? (
              <div
                className={`relative rounded-xl border p-2 overflow-hidden ${
                  isDark ? "bg-slate-950 border-slate-700" : "bg-white border-slate-300"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Payment Receipt Preview"
                  className="w-full max-h-40 sm:max-h-48 object-contain rounded-lg bg-black/40"
                />
                <div className="mt-2 flex items-center justify-between px-1">
                  <span
                    className={`text-[11px] truncate max-w-[200px] flex items-center gap-1 ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    <FileText size={12} className="text-blue-500" />
                    {selectedFile?.name || "Receipt Image"}
                  </span>
                  <button
                    type="button"
                    onClick={onFileClear}
                    className="text-red-500 hover:text-red-400 text-xs font-bold flex items-center gap-1 p-1 rounded-md hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {/* Mobile Camera Capture */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className={`p-2.5 sm:p-3 border border-dashed rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-h-[52px] ${
                    isDark
                      ? "border-slate-700 bg-slate-950/70 hover:bg-slate-800 text-slate-400 hover:text-blue-300 hover:border-blue-500"
                      : "border-slate-300 bg-white hover:bg-slate-100 text-slate-600 hover:text-blue-700 hover:border-blue-400"
                  }`}
                >
                  <Camera size={18} className="text-blue-500" />
                  <span className="text-[11px] font-bold">Snap Camera</span>
                  <span className="text-[9px] text-slate-400">Customer Phone</span>
                </button>

                {/* File Upload / Gallery */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2.5 sm:p-3 border border-dashed rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-h-[52px] ${
                    isDark
                      ? "border-slate-700 bg-slate-950/70 hover:bg-slate-800 text-slate-400 hover:text-blue-300 hover:border-blue-500"
                      : "border-slate-300 bg-white hover:bg-slate-100 text-slate-600 hover:text-blue-700 hover:border-blue-400"
                  }`}
                >
                  <Upload size={18} className="text-blue-500" />
                  <span className="text-[11px] font-bold">Upload Photo</span>
                  <span className="text-[9px] text-slate-400">Gallery / Screenshot</span>
                </button>
              </div>
            )}

            {/* Hidden File Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
};
