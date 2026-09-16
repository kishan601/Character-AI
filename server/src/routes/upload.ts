import { Router } from "express";
import { avatarUpload, wallpaperUpload } from "../middleware/upload.js";
import { isCloudinaryConfigured, uploadToCloudinary } from "../services/cloudinary.js";

export const uploadRouter = Router();

uploadRouter.post("/avatar", avatarUpload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    if (isCloudinaryConfigured()) {
      const secureUrl = await uploadToCloudinary(req.file.path, "avatars");
      res.json({ url: secureUrl, filename: req.file.filename });
      return;
    }

    const relativeUrl = `/uploads/avatars/${req.file.filename}`;
    res.json({ url: relativeUrl, filename: req.file.filename });
  } catch (err) {
    next(err);
  }
});

uploadRouter.post("/wallpaper", wallpaperUpload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    if (isCloudinaryConfigured()) {
      const secureUrl = await uploadToCloudinary(req.file.path, "wallpapers");
      res.json({ url: secureUrl, filename: req.file.filename });
      return;
    }

    const relativeUrl = `/uploads/wallpapers/${req.file.filename}`;
    res.json({ url: relativeUrl, filename: req.file.filename });
  } catch (err) {
    next(err);
  }
});
