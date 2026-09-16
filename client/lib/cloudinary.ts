/**
 * Cloudinary Unsigned Upload Utility for LabadaGo
 * Handles uploading shop photos directly from the client to Cloudinary.
 */

const CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "iq17lqxf";

const UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default";

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
}

/**
 * Upload a single image file to Cloudinary using an unsigned upload preset
 */
export async function uploadImageToCloudinary(file: File): Promise<string> {
  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error(`File "${file.name}" is not a supported image format.`);
  }

  // Validate file size (max 10MB)
  const MAX_SIZE_BYTES = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`Image "${file.name}" exceeds the 10MB size limit.`);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "labadago_shops");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData?.error?.message ||
      `Cloudinary upload failed with status ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  if (!data.secure_url) {
    throw new Error("Cloudinary response did not contain a secure_url.");
  }

  return data.secure_url as string;
}

/**
 * Upload multiple image files to Cloudinary in parallel, reporting progress
 */
export async function uploadMultipleImagesToCloudinary(
  files: File[],
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
  if (!files || files.length === 0) return [];

  let completed = 0;
  const total = files.length;

  const uploadPromises = files.map(async (file) => {
    try {
      const url = await uploadImageToCloudinary(file);
      completed += 1;
      if (onProgress) {
        onProgress(completed, total);
      }
      return url;
    } catch (err) {
      console.error(`Failed to upload ${file.name}:`, err);
      throw err;
    }
  });

  return Promise.all(uploadPromises);
}
