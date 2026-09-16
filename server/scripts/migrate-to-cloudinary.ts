import { prisma } from "../src/db.js";
import { uploadToCloudinary } from "../src/services/cloudinary.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "..");

async function main() {
  console.log("☁️  Checking characters and personas for local image uploads...\n");

  const characters = await prisma.character.findMany();
  for (const char of characters) {
    let updated = false;
    let newAvatarUrl = char.avatarUrl;
    let newBgUrl = char.backgroundUrl;

    if (char.avatarUrl && char.avatarUrl.startsWith("/uploads/")) {
      const localPath = path.join(serverRoot, char.avatarUrl);
      if (fs.existsSync(localPath)) {
        console.log(`Uploading avatar for "${char.name}" to Cloudinary...`);
        newAvatarUrl = await uploadToCloudinary(localPath, "avatars");
        updated = true;
      }
    }

    if (char.backgroundUrl && char.backgroundUrl.startsWith("/uploads/")) {
      const localPath = path.join(serverRoot, char.backgroundUrl);
      if (fs.existsSync(localPath)) {
        console.log(`Uploading wallpaper for "${char.name}" to Cloudinary...`);
        newBgUrl = await uploadToCloudinary(localPath, "wallpapers");
        updated = true;
      }
    }

    if (updated) {
      await prisma.character.update({
        where: { id: char.id },
        data: { avatarUrl: newAvatarUrl, backgroundUrl: newBgUrl },
      });
      console.log(`✓ Updated "${char.name}" with Cloudinary URLs.`);
    }
  }

  const personas = await prisma.userPersona.findMany();
  for (const p of personas) {
    if (p.avatarUrl && p.avatarUrl.startsWith("/uploads/")) {
      const localPath = path.join(serverRoot, p.avatarUrl);
      if (fs.existsSync(localPath)) {
        console.log(`Uploading persona avatar for "${p.name}" to Cloudinary...`);
        const newUrl = await uploadToCloudinary(localPath, "avatars");
        await prisma.userPersona.update({
          where: { id: p.id },
          data: { avatarUrl: newUrl },
        });
        console.log(`✓ Updated persona "${p.name}" with Cloudinary URL.`);
      }
    }
  }

  console.log("\n🎉 Cloudinary migration complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
