import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { z } from "zod";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} ${JSON.stringify(req.body)}`);
  next();
});

app.post("/tasks", async (req, res) => {
  const newTaskReq = z
    .object({
      text: z.string(),
    })
    .strict()
    .safeParse(req.body);
  if (!newTaskReq.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const newTask = await prisma.task.create({
    data: {
      ...newTaskReq.data,
      id: randomUUID(),
      completed: false,
    },
  });
  return res.status(201).json(newTask);
});

app.get("/tasks", async (req, res) => {
  const tasks = await prisma.task.findMany();
  return res.json(tasks);
});

app.post("/tasks/:id", async (req, res) => {
  const editTaskReq = z
    .object({
      text: z.string().optional(),
      completed: z.boolean().optional(),
    })
    .strict()
    .safeParse(req.body);
  if (!editTaskReq.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const editedTask = await prisma.task.update({
    data: editTaskReq.data,
    where: {
      id: req.params.id,
    },
  });
  return res.json(editedTask);
});

app.delete("/tasks/:id", async (req, res) => {
  const deletedTask = await prisma.task.delete({
    where: {
      id: req.params.id,
    },
  });
  return res.json(deletedTask);
});

app.get("/tasks/:id", async (req, res) => {
  const task = await prisma.task.findUnique({
    where: {
      id: req.params.id,
    },
  });
  if (task === null) {
    return res.status(404).json({ error: "Task not found" });
  }
  return res.json(task);
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
