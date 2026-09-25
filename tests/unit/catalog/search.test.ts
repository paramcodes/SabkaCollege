import { describe, expect, it } from "vitest";

import {
  MAX_CATALOG_SEARCH_LENGTH,
  filterCatalogCourses,
  normalizeCatalogCategory,
  normalizeCatalogSearch,
} from "../../../src/lib/validation/catalog-search";

const courses = [
  {
    slug: "writing-b",
    title: "Writing with a Point of View",
    description: "Find and communicate a central idea.",
    category: "Communication",
  },
  {
    slug: "digital-skills",
    title: "Digital Skills",
    description: "Work safely and confidently online.",
    category: "Digital skills",
  },
  {
    slug: "designing",
    title: "designing clear products",
    description: "Shape a useful product brief.",
    category: "Digital skills",
  },
] as const;

describe("catalog search normalization", () => {
  it("treats an absent or whitespace-only search as empty", () => {
    expect(normalizeCatalogSearch(undefined)).toBe("");
    expect(normalizeCatalogSearch("")).toBe("");
    expect(normalizeCatalogSearch(" \n\t ")).toBe("");
  });

  it("trims a query and collapses repeated whitespace", () => {
    expect(normalizeCatalogSearch("  digital   skills\nfor  work ")).toBe(
      "digital skills for work",
    );
  });

  it("rejects a query longer than the bounded URL input", () => {
    const oversizedQuery = "a".repeat(MAX_CATALOG_SEARCH_LENGTH + 1);

    expect(normalizeCatalogSearch(oversizedQuery)).toBeNull();
  });

  it("normalizes an absent category to the all-categories value", () => {
    expect(normalizeCatalogCategory(undefined)).toBe("");
    expect(normalizeCatalogCategory("  Digital skills ")).toBe("digital skills");
  });
});

describe("catalog filtering", () => {
  it("matches normalized course text and filters by normalized category", () => {
    expect(
      filterCatalogCourses(courses, {
        search: "  DIGITAL   skills  ",
        category: " digital SKILLS ",
      }),
    ).toEqual([courses[2], courses[1]]);
  });

  it("returns every course for empty search and category filters", () => {
    expect(
      filterCatalogCourses(courses, { search: "  ", category: "" }),
    ).toHaveLength(courses.length);
  });

  it("sorts matching courses by title and then slug", () => {
    expect(
      filterCatalogCourses(courses, { search: "", category: "" }).map(
        ({ slug }) => slug,
      ),
    ).toEqual(["designing", "digital-skills", "writing-b"]);
  });

  it("returns no courses for an invalid search or category", () => {
    expect(
      filterCatalogCourses(courses, {
        search: "a".repeat(MAX_CATALOG_SEARCH_LENGTH + 1),
        category: "",
      }),
    ).toEqual([]);

    expect(
      filterCatalogCourses(courses, { search: "", category: "unknown" }),
    ).toEqual([]);
  });
});
