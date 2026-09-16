import multer from "multer";
import path from "path";
import fs from "fs";
import { config } from "../config.js";

// Ensure directories exist
if (!fs.existsSync(config.avatarDir)) {
  fs.mkdirSync(config.avatarDir, { recursive: true });
}
if (!fs.existsSync(config.wallpaperDir)) {
  fs.mkdirSync(config.wallpaperDir, { recursive: true });
}

function createDiskStorage(subfolder: "avatars" | "wallpapers") {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = path.join(config.uploadDir, subfolder);
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = path
        .basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 30);
      const uniqueName = `${Date.now()}_${base}${ext}`;
      cb(null, uniqueName);
    },
  });
}

const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const extValid = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowed.test(file.mimetype);
  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(new Error("Only images (JPEG, PNG, WebP, GIF) are allowed."));
  }
};

export const avatarUpload = multer({
  storage: createDiskStorage("avatars"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

export const wallpaperUpload = multer({
  storage: createDiskStorage("wallpapers"),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter,
});
