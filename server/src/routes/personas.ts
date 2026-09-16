import { Router } from "express";
import { prisma } from "../db.js";

export const personasRouter = Router();

// GET all user personas
personasRouter.get("/", async (req, res, next) => {
  try {
    const personas = await prisma.userPersona.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(personas);
  } catch (err) {
    next(err);
  }
});

// POST create persona
personasRouter.post("/", async (req, res, next) => {
  try {
    const {
      name,
      description,
      gender,
      pronounSubject,
      pronounObject,
      pronounPossessive,
      pronounDeterminer,
      avatarUrl,
      isDefault,
    } = req.body;

    if (!name || !description) {
      res.status(400).json({ error: "Name and description are required." });
      return;
    }

    if (isDefault) {
      // Unset previous defaults
      await prisma.userPersona.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const persona = await prisma.userPersona.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        gender: gender?.trim() || null,
        pronounSubject: pronounSubject?.trim() || null,
        pronounObject: pronounObject?.trim() || null,
        pronounPossessive: pronounPossessive?.trim() || null,
        pronounDeterminer: pronounDeterminer?.trim() || null,
        avatarUrl: avatarUrl || null,
        isDefault: Boolean(isDefault),
      },
    });

    res.status(201).json(persona);
  } catch (err) {
    next(err);
  }
});

// PUT update persona
personasRouter.put("/:id", async (req, res, next) => {
  try {
    const {
      name,
      description,
      gender,
      pronounSubject,
      pronounObject,
      pronounPossessive,
      pronounDeterminer,
      avatarUrl,
      isDefault,
    } = req.body;

    if (isDefault) {
      await prisma.userPersona.updateMany({
        where: { isDefault: true, id: { not: req.params.id } },
        data: { isDefault: false },
      });
    }

    const persona = await prisma.userPersona.update({
      where: { id: req.params.id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        description: description !== undefined ? description.trim() : undefined,
        gender: gender !== undefined ? gender?.trim() || null : undefined,
        pronounSubject:
          pronounSubject !== undefined ? pronounSubject?.trim() || null : undefined,
        pronounObject:
          pronounObject !== undefined ? pronounObject?.trim() || null : undefined,
        pronounPossessive:
          pronounPossessive !== undefined ? pronounPossessive?.trim() || null : undefined,
        pronounDeterminer:
          pronounDeterminer !== undefined ? pronounDeterminer?.trim() || null : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : undefined,
      },
    });

    res.json(persona);
  } catch (err) {
    next(err);
  }
});

// DELETE persona
personasRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.userPersona.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
