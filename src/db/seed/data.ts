import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

import {
  courses,
  lessons,
  modules,
  type DatabaseSchema,
  type NewCourse,
  type NewLesson,
  type NewModule,
} from "../schema";

const seedTimestamp = new Date("2026-01-01T00:00:00.000Z");

/**
 * Preview lessons point at a repo-relative demo asset path. It is deliberately
 * not a real third-party URL and contains no secret, so the public preview
 * route stays structurally usable and the seed depends on no external host.
 */
const demoPreviewReference = (slug: string) => `/demo/preview/${slug}.mp4`;

export const seedCourses = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    slug: "foundations-of-modern-india",
    title: "Foundations of Modern India",
    shortDescription:
      "A concise introduction to the institutions and ideas that shaped modern India.",
    description:
      "A concise introduction to the institutions, movements, and ideas that shaped modern India, from independence to the everyday practice of democracy.",
    coverImageUrl: null,
    status: "published",
    priceAmount: 499900,
    currency: "INR",
    clerkProductId: null,
    clerkPriceId: null,
    estimatedDurationMinutes: 95,
    publishedAt: seedTimestamp,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    slug: "digital-skills-modern-workplace",
    title: "Digital Skills for the Modern Workplace",
    shortDescription:
      "Practical lessons for collaboration, online communication, and career readiness.",
    description:
      "Practical lessons for productive collaboration, online communication, digital safety, and career readiness in the modern workplace.",
    coverImageUrl: null,
    status: "published",
    priceAmount: 399900,
    currency: "INR",
    clerkProductId: null,
    clerkPriceId: null,
    estimatedDurationMinutes: 80,
    publishedAt: seedTimestamp,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    slug: "creative-writing-studio",
    title: "Creative Writing Studio",
    shortDescription:
      "A draft course exploring voice, structure, and the craft of writing.",
    description:
      "A draft course exploring voice, structure, rhythm, and the craft of writing compelling stories. Not yet visible in the public catalog.",
    coverImageUrl: null,
    status: "draft",
    priceAmount: 299900,
    currency: "INR",
    clerkProductId: null,
    clerkPriceId: null,
    estimatedDurationMinutes: 60,
    publishedAt: null,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
] satisfies NewCourse[];

export const seedModules = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    courseId: seedCourses[0].id,
    title: "Historical Foundations",
    description: "The events and conditions that created modern India.",
    position: 0,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    courseId: seedCourses[0].id,
    title: "Living Democracy",
    description: "How citizens, institutions, and movements interact today.",
    position: 1,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    courseId: seedCourses[1].id,
    title: "Digital Foundations",
    description: "Everyday tools and responsible digital habits.",
    position: 0,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    courseId: seedCourses[1].id,
    title: "Professional Collaboration",
    description: "Communication and teamwork across digital tools.",
    position: 1,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "20000000-0000-4000-8000-000000000005",
    courseId: seedCourses[2].id,
    title: "Finding Your Voice",
    description: "Draft lessons for developing a distinct writing voice.",
    position: 0,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
] satisfies NewModule[];

export const seedLessons = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    moduleId: seedModules[0].id,
    slug: "india-in-1947",
    title: "India in 1947: A New Beginning",
    description: "The conditions surrounding independence and the new nation.",
    position: 0,
    videoProvider: "external",
    videoReference: demoPreviewReference("india-in-1947"),
    durationSeconds: 720,
    isPreview: true,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    moduleId: seedModules[0].id,
    slug: "building-the-republic",
    title: "Building the Republic",
    description: "The institutions and principles of the Republic.",
    position: 1,
    videoProvider: "external",
    videoReference: null,
    durationSeconds: 840,
    isPreview: false,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    moduleId: seedModules[1].id,
    slug: "citizenship-and-participation",
    title: "Citizenship and Participation",
    description: "How participation sustains democratic institutions.",
    position: 0,
    videoProvider: "external",
    videoReference: demoPreviewReference("citizenship-and-participation"),
    durationSeconds: 660,
    isPreview: true,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    moduleId: seedModules[2].id,
    slug: "digital-safety-essentials",
    title: "Digital Safety Essentials",
    description: "Protect accounts, privacy, and personal information.",
    position: 0,
    videoProvider: "external",
    videoReference: demoPreviewReference("digital-safety-essentials"),
    durationSeconds: 600,
    isPreview: true,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "30000000-0000-4000-8000-000000000005",
    moduleId: seedModules[3].id,
    slug: "clear-online-collaboration",
    title: "Clear Online Collaboration",
    description: "Communicate clearly and collaborate across time zones.",
    position: 0,
    videoProvider: "external",
    videoReference: null,
    durationSeconds: 780,
    isPreview: false,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "30000000-0000-4000-8000-000000000006",
    moduleId: seedModules[4].id,
    slug: "voice-rhythm-and-restraint",
    title: "Voice, Rhythm, and Restraint",
    description: "Shape sentences that sound clear and intentional.",
    position: 0,
    videoProvider: "external",
    videoReference: null,
    durationSeconds: 900,
    isPreview: false,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
] satisfies NewLesson[];

/**
 * Writes catalog content in dependency order (courses, then modules, then
 * lessons) using stable primary keys and upserts.
 *
 * The Neon HTTP driver is request-at-a-time and has no interactive
 * transaction support, so this deliberately does not wrap the writes in
 * `database.transaction(...)`. Ordering plus upsert-on-id makes the seed safe
 * to rerun: a second run updates the same rows instead of inserting duplicates.
 */
export async function insertSeedData(
  database: NeonHttpDatabase<DatabaseSchema>,
): Promise<void> {
  for (const course of seedCourses) {
    await database
      .insert(courses)
      .values(course)
      .onConflictDoUpdate({ target: courses.id, set: course });
  }

  for (const courseModule of seedModules) {
    await database
      .insert(modules)
      .values(courseModule)
      .onConflictDoUpdate({ target: modules.id, set: courseModule });
  }

  for (const lesson of seedLessons) {
    await database
      .insert(lessons)
      .values(lesson)
      .onConflictDoUpdate({ target: lessons.id, set: lesson });
  }
}
