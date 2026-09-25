import { describe, expect, it } from "vitest";

import { selectLearningNavigation } from "@/src/lib/learning/timeline";

const modules = [
  {
    title: "One",
    position: 0,
    lessons: [
      { slug: "first", title: "First", position: 0 },
      { slug: "second", title: "Second", position: 1 },
    ],
  },
  {
    title: "Two",
    position: 1,
    lessons: [{ slug: "third", title: "Third", position: 0 }],
  },
];

describe("selectLearningNavigation", () => {
  it("selects the current lesson and adjacent lessons in course order", () => {
    expect(selectLearningNavigation(modules, "second")).toMatchObject({
      current: { slug: "second" },
      previous: { slug: "first" },
      next: { slug: "third" },
    });
  });

  it("returns null for an unknown lesson and no adjacent lessons at the end", () => {
    expect(selectLearningNavigation(modules, "unknown")).toBeNull();
    expect(selectLearningNavigation(modules, "third")).toMatchObject({
      previous: { slug: "second" },
      next: null,
    });
  });
});
