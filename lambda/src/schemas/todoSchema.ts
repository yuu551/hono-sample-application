import { z } from "@hono/zod-openapi";

export const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

export const CreateTodoSchema = z.object({
  title: z.string(),
  completed: z.boolean().optional().default(false),
});

export const UpdateTodoSchema = z.object({
  title: z.string().optional(),
  completed: z.boolean().optional(),
});

export const TodoParamsSchema = z.object({
  id: z.string(),
});

export const ErrorSchema = z.object({
  code: z.number().openapi({
    example: 400,
  }),
  message: z.string().openapi({
    example: "Bad Request",
  }),
});
