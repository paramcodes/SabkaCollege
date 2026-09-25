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

export const seedCourses = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    courseSlug: "foundations-of-modern-india",
    title: "Foundations of Modern India",
    description:
      "A concise introduction to the institutions, movements, and ideas that shaped modern India.",
    status: "published",
    priceCents: 499900,
    currency: "INR",
    coverImageUrl: null,
    publishedAt: seedTimestamp,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    courseSlug: "digital-skills-modern-workplace",
    title: "Digital Skills for the Modern Workplace",
    description:
      "Practical lessons for productive collaboration, online communication, and career readiness.",
    status: "published",
    priceCents: 399900,
    currency: "INR",
    coverImageUrl: null,
    publishedAt: seedTimestamp,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    courseSlug: "creative-writing-studio",
    title: "Creative Writing Studio",
    description:
      "A draft course exploring voice, structure, and the craft of writing compelling stories.",
    status: "draft",
    priceCents: 299900,
    currency: "INR",
    coverImageUrl: null,
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
    title: "India in 1947: A New Beginning",
    description: "The conditions surrounding independence and the new nation.",
    position: 0,
    type: "video",
    videoUrl: null,
    durationSeconds: 720,
    isPreview: true,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    moduleId: seedModules[0].id,
    title: "Building the Republic",
    description: "The institutions and principles of the Republic.",
    position: 1,
    type: "video",
    videoUrl: null,
    durationSeconds: 840,
    isPreview: false,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    moduleId: seedModules[1].id,
    title: "Citizenship and Participation",
    description: "How participation sustains democratic institutions.",
    position: 0,
    type: "video",
    videoUrl: null,
    durationSeconds: 660,
    isPreview: true,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    moduleId: seedModules[2].id,
    title: "Digital Safety Essentials",
    description: "Protect accounts, privacy, and personal information.",
    position: 0,
    type: "video",
    videoUrl: null,
    durationSeconds: 600,
    isPreview: true,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "30000000-0000-4000-8000-000000000005",
    moduleId: seedModules[3].id,
    title: "Clear Online Collaboration",
    description: "Communicate clearly and collaborate across time zones.",
    position: 0,
    type: "video",
    videoUrl: null,
    durationSeconds: 780,
    isPreview: false,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "30000000-0000-4000-8000-000000000006",
    moduleId: seedModules[4].id,
    title: "Voice, Rhythm, and Restraint",
    description: "Shape sentences that sound clear and intentional.",
    position: 0,
    type: "video",
    videoUrl: null,
    durationSeconds: 900,
    isPreview: false,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
] satisfies NewLesson[];

export async function insertSeedData(
  database: NeonHttpDatabase<DatabaseSchema>,
): Promise<void> {
  await database.transaction(async (transaction) => {
    for (const course of seedCourses) {
      await transaction
        .insert(courses)
        .values(course)
        .onConflictDoUpdate({ target: courses.courseSlug, set: course });
    }

    for (const courseModule of seedModules) {
      await transaction
        .insert(modules)
        .values(courseModule)
        .onConflictDoUpdate({ target: modules.id, set: courseModule });
    }

    for (const lesson of seedLessons) {
      await transaction
        .insert(lessons)
        .values(lesson)
        .onConflictDoUpdate({ target: lessons.id, set: lesson });
    }
  });
}
