import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

export function isCloudinaryConfigured(): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
  return Boolean(
    process.env.CLOUDINARY_URL ||
      (cloudName && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );
}

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
  });
} else if (
  cloudName &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function uploadToCloudinary(
  localFilePath: string,
  folder: "avatars" | "wallpapers"
): Promise<string> {
  const result = await cloudinary.uploader.upload(localFilePath, {
    folder: `character-ai/${folder}`,
    resource_type: "auto", // Automatically handles static images, animated WebP, and GIF
  });

  // Clean up local temporary file
  try {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
  } catch (err) {
    console.warn("Could not remove temp upload file:", err);
  }

  return result.secure_url;
}
