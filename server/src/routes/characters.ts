import { Router } from "express";
import { prisma } from "../db.js";
import fs from "fs";
import path from "path";
import { config } from "../config.js";

export const charactersRouter = Router();

// GET all characters
charactersRouter.get("/", async (req, res, next) => {
  try {
    const characters = await prisma.character.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { sessions: true } },
      },
    });
    res.json(characters);
  } catch (err) {
    next(err);
  }
});

// GET single character
charactersRouter.get("/:id", async (req, res, next) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
      include: {
        sessions: {
          orderBy: { updatedAt: "desc" },
          take: 5,
        },
        memories: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!character) {
      res.status(404).json({ error: "Character not found" });
      return;
    }

    res.json(character);
  } catch (err) {
    next(err);
  }
});

// POST create character
charactersRouter.post("/", async (req, res, next) => {
  try {
    const {
      name,
      tagline,
      description,
      greeting,
      systemPrompt,
      exampleDialogue,
      avatarUrl,
      backgroundUrl,
      bgBlur,
      bgDim,
    } = req.body;

    if (!name || !greeting || !systemPrompt) {
      res.status(400).json({
        error: "Name, greeting, and systemPrompt are required fields.",
      });
      return;
    }

    const character = await prisma.character.create({
      data: {
        name: name.trim(),
        tagline: tagline?.trim() || null,
        description: description?.trim() || null,
        greeting: greeting.trim(),
        systemPrompt: systemPrompt.trim(),
        exampleDialogue: exampleDialogue?.trim() || null,
        avatarUrl: avatarUrl || null,
        backgroundUrl: backgroundUrl || null,
        bgBlur: typeof bgBlur === "number" ? bgBlur : 0,
        bgDim: typeof bgDim === "number" ? bgDim : 40,
      },
    });

    res.status(201).json(character);
  } catch (err) {
    next(err);
  }
});

// PUT update character
charactersRouter.put("/:id", async (req, res, next) => {
  try {
    const {
      name,
      tagline,
      description,
      greeting,
      systemPrompt,
      exampleDialogue,
      avatarUrl,
      backgroundUrl,
      bgBlur,
      bgDim,
    } = req.body;

    const character = await prisma.character.update({
      where: { id: req.params.id },
      data: {
        name: name?.trim(),
        tagline: tagline !== undefined ? tagline?.trim() || null : undefined,
        description:
          description !== undefined ? description?.trim() || null : undefined,
        greeting: greeting?.trim(),
        systemPrompt: systemPrompt?.trim(),
        exampleDialogue:
          exampleDialogue !== undefined
            ? exampleDialogue?.trim() || null
            : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        backgroundUrl: backgroundUrl !== undefined ? backgroundUrl : undefined,
        bgBlur: typeof bgBlur === "number" ? bgBlur : undefined,
        bgDim: typeof bgDim === "number" ? bgDim : undefined,
      },
    });

    res.json(character);
  } catch (err) {
    next(err);
  }
});

// DELETE character
charactersRouter.delete("/:id", async (req, res, next) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
    });

    if (!character) {
      res.status(404).json({ error: "Character not found" });
      return;
    }

    // Attempt to remove local uploaded files if they are in /uploads
    if (character.avatarUrl && character.avatarUrl.startsWith("/uploads/")) {
      const p = path.join(config.uploadDir, character.avatarUrl.replace("/uploads/", ""));
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    if (character.backgroundUrl && character.backgroundUrl.startsWith("/uploads/")) {
      const p = path.join(config.uploadDir, character.backgroundUrl.replace("/uploads/", ""));
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    await prisma.character.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, message: "Character deleted" });
  } catch (err) {
    next(err);
  }
});
