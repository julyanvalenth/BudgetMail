import type { FastifyInstance } from "fastify";
import type { CreateCategoryInput } from "@budgetmail/shared-types";
import { requireAuth } from "../auth/index.js";
import type { CategoryService } from "./category.service.js";

export interface CategoryRoutesDeps {
  categoryService: CategoryService;
}

const createCategorySchema = {
  body: {
    type: "object",
    required: ["name", "type"],
    additionalProperties: false,
    properties: {
      name: { type: "string", minLength: 1, maxLength: 40, pattern: "\\S" },
      type: { type: "string", enum: ["income", "expense"] },
      icon: { type: "string", pattern: "^[a-z0-9-]{1,40}$" },
    },
  },
} as const;

export function categoryRoutes(deps: CategoryRoutesDeps) {
  const { categoryService } = deps;

  return async function routes(app: FastifyInstance) {
    app.addHook("onRequest", requireAuth);

    app.get("/categories", async (request) => {
      return { items: await categoryService.list(request.userId!) };
    });

    app.post("/categories", { schema: createCategorySchema }, async (request, reply) => {
      const created = await categoryService.create(
        request.userId!,
        request.body as CreateCategoryInput,
      );
      return reply.code(201).send(created);
    });
  };
}
