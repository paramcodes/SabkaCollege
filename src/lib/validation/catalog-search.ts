export const MAX_CATALOG_SEARCH_LENGTH = 120;
const MAX_CATALOG_CATEGORY_LENGTH = 80;

const firstSearchValue = (value: unknown): string | null => {
  if (value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "";
    }

    return typeof value[0] === "string" ? value[0] : null;
  }

  return typeof value === "string" ? value : null;
};

export function normalizeCatalogSearch(value: unknown): string | null {
  const search = firstSearchValue(value);
  if (search === null) {
    return null;
  }

  const normalized = search.trim().replace(/\s+/g, " ");
  if (normalized.length > MAX_CATALOG_SEARCH_LENGTH) {
    return null;
  }

  return normalized;
}

export function normalizeCatalogCategory(value: unknown): string | null {
  const category = firstSearchValue(value);
  if (category === null) {
    return null;
  }

  const normalized = category.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
  if (normalized.length > MAX_CATALOG_CATEGORY_LENGTH) {
    return null;
  }

  return normalized;
}

export type CatalogSearchableCourse = {
  slug: string;
  title: string;
  description: string;
  category: string;
};

const titleCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

export function filterCatalogCourses<T extends CatalogSearchableCourse>(
  courses: readonly T[],
  filters: { search: unknown; category: unknown },
): T[] {
  const search = normalizeCatalogSearch(filters.search);
  const category = normalizeCatalogCategory(filters.category);

  if (search === null || category === null) {
    return [];
  }

  const query = search.toLocaleLowerCase("en");

  return courses
    .filter((course) => {
      const searchableText = `${course.title} ${course.description} ${course.category}`;
      const matchesSearch = query.length === 0 || searchableText.toLocaleLowerCase("en").includes(query);
      const courseCategory = normalizeCatalogCategory(course.category) ?? "";
      const matchesCategory = category.length === 0 || courseCategory === category;

      return matchesSearch && matchesCategory;
    })
    .sort((left, right) => {
      const titleComparison = titleCollator.compare(left.title, right.title);
      return titleComparison === 0
        ? titleCollator.compare(left.slug, right.slug)
        : titleComparison;
    });
}
