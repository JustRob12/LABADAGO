"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Star,
  Loader2,
  AlertCircle,
  Plus,
  Maximize2,
  X,
} from "lucide-react";
import { uploadMultipleImagesToCloudinary } from "@/lib/cloudinary";

interface ShopImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export const ShopImageUploader: React.FC<ShopImageUploaderProps> = ({
  images = [],
  onChange,
  maxImages = 10,
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0 || disabled) return;
    setErrorMessage(null);

    const fileArray = Array.from(files);

    // Validate available slots
    const availableSlots = maxImages - images.length;
    if (availableSlots <= 0) {
      setErrorMessage(`You can only upload up to ${maxImages} images per shop.`);
      return;
    }

    const filesToUpload = fileArray.slice(0, availableSlots);
    if (fileArray.length > availableSlots) {
      setErrorMessage(`Only ${availableSlots} more image(s) can be added (max ${maxImages}).`);
    }

    setIsUploading(true);
    setUploadProgress({ completed: 0, total: filesToUpload.length });

    try {
      const uploadedUrls = await uploadMultipleImagesToCloudinary(
        filesToUpload,
        (completed, total) => {
          setUploadProgress({ completed, total });
        }
      );

      // Append new URLs to existing list
      onChange([...images, ...uploadedUrls]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload images to Cloudinary.";
      setErrorMessage(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    if (disabled) return;
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleSetCover = (indexToCover: number) => {
    if (disabled || indexToCover === 0) return;
    const target = images[indexToCover];
    const remaining = images.filter((_, idx) => idx !== indexToCover);
    onChange([target, ...remaining]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-semibold text-slate-700">
            Shop Photos & Facade
          </label>
          <p className="text-[11px] text-slate-500">
            Upload multiple photos of your storefront, washing machines, folding area, or signage. The first photo will be your shop cover.
          </p>
        </div>
        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {images.length} / {maxImages} photos
        </span>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        multiple
        disabled={disabled || isUploading || images.length >= maxImages}
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
      />

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertCircle size={14} className="shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Upload Zone (shown prominently when empty, or as compact trigger when photos exist) */}
      {images.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragOver
              ? "border-emerald-500 bg-emerald-50/50 scale-[0.99]"
              : "border-slate-300 hover:border-emerald-400 bg-slate-50/60 hover:bg-slate-50"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {isUploading ? (
            <div className="py-4 flex flex-col items-center justify-center gap-2">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
              <p className="text-xs font-semibold text-slate-700">
                Uploading to Cloudinary ({uploadProgress?.completed || 0} of {uploadProgress?.total || 0})...
              </p>
              <p className="text-[11px] text-slate-400">Please wait while your images are processed</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <UploadCloud size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Click to upload photos or drag and drop
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  PNG, JPG, or WEBP up to 10MB each (up to {maxImages} images)
                </p>
              </div>
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-xs hover:bg-emerald-700 transition-colors"
              >
                <Plus size={13} /> Select Photos
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Image Grid */
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((url, index) => {
              const isCover = index === 0;
              return (
                <div
                  key={`${url}-${index}`}
                  className={`group relative rounded-xl overflow-hidden border bg-slate-100 aspect-4/3 transition-all ${
                    isCover
                      ? "ring-2 ring-emerald-500 border-emerald-500 shadow-sm"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Image */}
                  <img
                    src={url}
                    alt={`Shop photo ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Cover Badge */}
                  {isCover && (
                    <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                      <Star size={10} className="fill-white" />
                      <span>Cover Photo</span>
                    </div>
                  )}

                  {/* Overlay Action Buttons */}
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                    <button
                      type="button"
                      onClick={() => setPreviewImage(url)}
                      className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:text-blue-600 hover:bg-white shadow-xs cursor-pointer transition-colors"
                      title="Preview full photo"
                    >
                      <Maximize2 size={13} />
                    </button>

                    {!isCover && (
                      <button
                        type="button"
                        onClick={() => handleSetCover(index)}
                        className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:text-emerald-600 hover:bg-white shadow-xs cursor-pointer transition-colors"
                        title="Set as cover photo"
                      >
                        <Star size={13} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:text-red-600 hover:bg-white shadow-xs cursor-pointer transition-colors"
                      title="Delete photo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add More Photos Card */}
            {images.length < maxImages && (
              <button
                type="button"
                disabled={disabled || isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-400 bg-slate-50/70 hover:bg-emerald-50/40 aspect-4/3 flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-emerald-700 transition-all cursor-pointer p-3"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={20} className="animate-spin text-emerald-600" />
                    <span className="text-[11px] font-semibold text-slate-600">
                      Uploading {uploadProgress?.completed}/{uploadProgress?.total}...
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full bg-slate-200/80 group-hover:bg-emerald-100 flex items-center justify-center">
                      <Plus size={16} />
                    </div>
                    <span className="text-[11px] font-semibold">Add Photo</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Photo Fullscreen Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] w-full rounded-2xl overflow-hidden bg-slate-900 shadow-2xl border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
            <img
              src={previewImage}
              alt="Shop photo expanded preview"
              className="w-full h-auto max-h-[80vh] object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
