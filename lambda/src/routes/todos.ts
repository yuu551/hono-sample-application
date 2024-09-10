import { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import {
  TodoSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  TodoParamsSchema,
  ErrorSchema,
} from "../schemas/todoSchema";
import { TodoTable } from "../database/todoTable";

const todoRouter = new OpenAPIHono();
const todoTable = new TodoTable({ region: "ap-northeast-1" });

const getAllTodosRouteSchema = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: TodoSchema.array(),
        },
      },
      description: "List all todos",
    },
  },
});

const getTodoByIdRouteSchema = createRoute({
  method: "get",
  path: "/{id}",
  request: {
    params: TodoParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: TodoSchema,
        },
      },
      description: "Get a todo by ID",
    },
    404: {
      description: "Todo not found",
    },
  },
});

const createTodoRouteSchema = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateTodoSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: TodoSchema,
        },
      },
      description: "Todo created successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Bad Request",
    },
  },
});

const updateTodoRouteSchema = createRoute({
  method: "put",
  path: "/{id}",
  request: {
    params: TodoParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: UpdateTodoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: TodoSchema,
        },
      },
      description: "Todo updated successfully",
    },
    404: {
      description: "Todo not found",
    },
  },
});

const deleteTodoRouteSchema = createRoute({
  method: "delete",
  path: "/{id}",
  request: {
    params: TodoParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
      description: "Todo deleted successfully",
    },
    404: {
      description: "Todo not found",
    },
  },
});

export const getAllTodosRoute = todoRouter.openapi(
  getAllTodosRouteSchema,
  async (c) => {
    const todos = await todoTable.getAllTodos();
    return c.json(todos);
  }
);

export const getTodoByIdRoute = todoRouter.openapi(
  getTodoByIdRouteSchema,
  async (c) => {
    const { id } = c.req.valid("param");
    const todo = await todoTable.getTodoById(id);
    if (!todo) return c.notFound();
    return c.json(todo);
  }
);

export const createTodoRoute = todoRouter.openapi(
  createTodoRouteSchema,
  async (c) => {
    const body = c.req.valid("json");
    const newTodo = await todoTable.createTodo(body);
    return c.json(newTodo, 201);
  }
);

export const updateTodoRoute = todoRouter.openapi(
  updateTodoRouteSchema,
  async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const updatedTodo = await todoTable.updateTodo(id, body);
    if (!updatedTodo) return c.notFound();
    return c.json(updatedTodo);
  }
);

export const deleteTodoRoute = todoRouter.openapi(
  deleteTodoRouteSchema,
  async (c) => {
    const { id } = c.req.valid("param");
    await todoTable.deleteTodo(id);
    return c.json({ message: "Todo deleted successfully" });
  }
);

export { todoRouter };
