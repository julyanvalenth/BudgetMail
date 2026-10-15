import type { Category, PrismaClient } from "@prisma/client";
import type { CategoryType } from "@budgetmail/shared-types";
import { ConflictError } from "../../shared/errors.js";

export interface NewCategory {
  name: string;
  icon: string;
  type: CategoryType;
}

export interface CategoryRepository {
  // Global defaults plus the user's own categories.
  listForUser(userId: string): Promise<Category[]>;
  // Defaults or the user's own, never another user's category.
  findAccessible(userId: string, id: string): Promise<Category | null>;
  findAccessibleByName(userId: string, name: string, type: CategoryType): Promise<Category | null>;
  create(userId: string, data: NewCategory): Promise<Category>;
  findOrCreateByName(userId: string, name: string, type: CategoryType): Promise<Category>;
}

const DEFAULT_CUSTOM_ICON = "tag";

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listForUser(userId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { OR: [{ userId: null }, { userId }] },
      orderBy: [{ userId: { sort: "asc", nulls: "first" } }, { name: "asc" }],
    });
  }

  findAccessible(userId: string, id: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { id, OR: [{ userId: null }, { userId }] },
    });
  }

  findAccessibleByName(userId: string, name: string, type: CategoryType): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: {
        type,
        name: { equals: name, mode: "insensitive" },
        OR: [{ userId: null }, { userId }],
      },
    });
  }

  async create(userId: string, data: NewCategory): Promise<Category> {
    try {
      return await this.prisma.category.create({ data: { ...data, userId } });
    } catch (err) {
      // Two concurrent creates can both get past the service's duplicate check.
      if ((err as { code?: string }).code === "P2002") {
        throw new ConflictError(`Kategori "${data.name}" sudah ada`);
      }
      throw err;
    }
  }

  // Prefers the seeded global default, so parsed and manual transactions share one
  // category. The per-user fallback is an upsert because parsing jobs run concurrently
  // during a backfill and a find-then-create would make duplicates.
  async findOrCreateByName(userId: string, name: string, type: CategoryType): Promise<Category> {
    const existingDefault = await this.prisma.category.findFirst({
      where: { userId: null, name, type },
    });
    if (existingDefault) {
      return existingDefault;
    }
    return this.prisma.category.upsert({
      where: { userId_name_type: { userId, name, type } },
      update: {},
      create: { userId, name, type, icon: DEFAULT_CUSTOM_ICON },
    });
  }
}
