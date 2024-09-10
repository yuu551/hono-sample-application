import { OpenAPIHono } from "@hono/zod-openapi";
import { todoRouter } from "./routes/todos";
import { swaggerUI } from "@hono/swagger-ui";
import { logger } from "hono/logger";
import { createFactory } from "hono/factory";

const app = new OpenAPIHono();
const factory = createFactory();

// Key認証のMiddleware
const keyAuthMiddleware = factory.createMiddleware(async (c, next) => {
  const apiKey = c.req.header("X-API-Custom-Key");
  if (apiKey !== process.env.API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

// ログ認証を実装
app.use("*", logger());
// Key認証を実装
app.use("*", keyAuthMiddleware);

app.route("/todos", todoRouter);

app
  .doc("/doc", {
    openapi: "3.0.0",
    info: {
      title: "Todo API",
      version: "1.0.0",
    },
  })
  .get("/ui", swaggerUI({ url: "/doc" }));

export default app;
