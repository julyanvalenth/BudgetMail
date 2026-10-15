import type { CategoryDto, CreateCategoryInput } from "@budgetmail/shared-types";
import { ConflictError } from "../../shared/errors.js";
import { toCategoryDto } from "./category.mapper.js";
import type { CategoryRepository } from "./category.repository.js";

const DEFAULT_CUSTOM_ICON = "tag";

export class CategoryService {
  constructor(private readonly categories: CategoryRepository) {}

  async list(userId: string): Promise<CategoryDto[]> {
    const categories = await this.categories.listForUser(userId);
    return categories.map(toCategoryDto);
  }

  async create(userId: string, input: CreateCategoryInput): Promise<CategoryDto> {
    const name = input.name.trim().replace(/\s+/g, " ");
    // Case-insensitive, so "makanan" can't shadow the default "Makanan".
    const clash = await this.categories.findAccessibleByName(userId, name, input.type);
    if (clash) {
      throw new ConflictError(`Kategori "${clash.name}" sudah ada`);
    }
    const created = await this.categories.create(userId, {
      name,
      type: input.type,
      icon: input.icon ?? DEFAULT_CUSTOM_ICON,
    });
    return toCategoryDto(created);
  }
}
