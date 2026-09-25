import {
  createTableRelationsHelpers,
  extractTablesRelationalConfig,
  Many,
  One,
} from "drizzle-orm";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  completionMethod,
  courseStatus,
  courses,
  lessonProgress,
  lessonVideoProvider,
  lessons,
  modules,
  purchaseStatus,
  purchases,
  schema,
  userRole,
  users,
} from "../../../src/db/schema";

const columnNames = (table: PgTable) =>
  getTableConfig(table).columns.map((column) => column.name);

const column = (table: PgTable, name: string) => {
  const match = getTableConfig(table).columns.find(
    (candidate) => candidate.name === name,
  );

  if (!match) {
    throw new Error(`Missing column ${getTableConfig(table).name}.${name}`);
  }

  return match;
};

const indexes = (table: PgTable) =>
  getTableConfig(table).indexes.map((index) => ({
    name: index.config.name,
    unique: index.config.unique,
    columns: index.config.columns.map((indexColumn) =>
      typeof indexColumn === "object" &&
      indexColumn !== null &&
      "name" in indexColumn
        ? String(indexColumn.name)
        : String(indexColumn),
    ),
  }));

const foreignKeys = (table: PgTable) =>
  getTableConfig(table).foreignKeys.map((foreignKey) => {
    const reference = foreignKey.reference();

    return {
      columns: reference.columns.map((referenceColumn) => referenceColumn.name),
      foreignTable: getTableConfig(reference.foreignTable).name,
      foreignColumns: reference.foreignColumns.map(
        (referenceColumn) => referenceColumn.name,
      ),
      onDelete: foreignKey.onDelete,
    };
  });

const relationalTables = extractTablesRelationalConfig(
  schema,
  createTableRelationsHelpers,
).tables;

const expectManyRelation = (
  relation: (typeof relationalTables)[keyof typeof relationalTables]["relations"][string],
  referencedTableName: string,
) => {
  expect(relation).toBeInstanceOf(Many);
  expect(relation.referencedTableName).toBe(referencedTableName);
};

const expectOneRelation = (
  relation: (typeof relationalTables)[keyof typeof relationalTables]["relations"][string],
  referencedTableName: string,
  fields: string[],
  references: string[],
) => {
  expect(relation).toBeInstanceOf(One);

  if (!(relation instanceof One)) {
    throw new Error(`Expected ${referencedTableName} to be a one relation`);
  }

  expect(relation.referencedTableName).toBe(referencedTableName);
  expect(relation.config?.fields.map((field) => field.name)).toEqual(fields);
  expect(relation.config?.references.map((reference) => reference.name)).toEqual(
    references,
  );
};

describe("database schema contract", () => {
  it("defines the Clerk identity mirror and synchronized role fields", () => {
    expect(getTableConfig(users).name).toBe("users");
    expect(columnNames(users)).toEqual([
      "id",
      "email",
      "name",
      "avatar_url",
      "role",
      "last_synced_at",
      "created_at",
      "updated_at",
    ]);

    expect(column(users, "id").primary).toBe(true);
    expect(column(users, "id").getSQLType()).toBe("text");
    expect(column(users, "email").notNull).toBe(true);
    expect(column(users, "name").notNull).toBe(false);
    expect(column(users, "avatar_url").notNull).toBe(false);
    expect(column(users, "role").enumValues).toEqual(["student", "admin"]);
    expect(column(users, "role").notNull).toBe(true);
    expect(column(users, "role").default).toBe("student");
    expect(column(users, "last_synced_at").hasDefault).toBe(true);
    expect(column(users, "created_at").getSQLType()).toBe(
      "timestamp with time zone",
    );
    expect(column(users, "updated_at").hasDefault).toBe(true);
  });

  it("defines course catalog, billing, and lesson media contracts", () => {
    expect(columnNames(courses)).toEqual([
      "id",
      "slug",
      "title",
      "short_description",
      "description",
      "cover_image_url",
      "status",
      "price_amount",
      "currency",
      "clerk_product_id",
      "clerk_price_id",
      "estimated_duration_minutes",
      "published_at",
      "created_at",
      "updated_at",
    ]);
    expect(column(courses, "id").primary).toBe(true);
    expect(column(courses, "slug").notNull).toBe(true);
    expect(column(courses, "short_description").notNull).toBe(false);
    expect(column(courses, "cover_image_url").notNull).toBe(false);
    expect(column(courses, "status").enumValues).toEqual([
      "draft",
      "published",
      "archived",
    ]);
    expect(column(courses, "price_amount").getSQLType()).toBe("integer");
    expect(column(courses, "price_amount").notNull).toBe(true);
    expect(column(courses, "currency").notNull).toBe(true);
    expect(column(courses, "clerk_product_id").notNull).toBe(false);
    expect(column(courses, "clerk_price_id").notNull).toBe(false);
    expect(column(courses, "estimated_duration_minutes").getSQLType()).toBe(
      "integer",
    );
    expect(column(courses, "published_at").notNull).toBe(false);

    expect(columnNames(lessons)).toEqual([
      "id",
      "module_id",
      "slug",
      "title",
      "description",
      "position",
      "video_provider",
      "video_reference",
      "duration_seconds",
      "is_preview",
      "created_at",
      "updated_at",
    ]);
    expect(column(lessons, "slug").notNull).toBe(true);
    expect(column(lessons, "video_provider").enumValues).toEqual([
      "youtube",
      "vimeo",
      "mux",
      "cloudflare_stream",
      "external",
    ]);
    expect(column(lessons, "video_provider").notNull).toBe(true);
    expect(column(lessons, "video_reference").notNull).toBe(false);
    expect(column(lessons, "duration_seconds").getSQLType()).toBe("integer");
    expect(column(lessons, "duration_seconds").default).toBe(0);
    expect(column(lessons, "is_preview").getSQLType()).toBe("boolean");
    expect(column(lessons, "is_preview").default).toBe(false);
  });

  it("defines purchase and lesson-progress persistence fields", () => {
    expect(columnNames(purchases)).toEqual([
      "id",
      "clerk_purchase_id",
      "user_id",
      "course_id",
      "amount",
      "currency",
      "status",
      "purchased_at",
      "created_at",
      "updated_at",
    ]);
    expect(column(purchases, "clerk_purchase_id").notNull).toBe(true);
    expect(column(purchases, "user_id").getSQLType()).toBe("text");
    expect(column(purchases, "amount").getSQLType()).toBe("integer");
    expect(column(purchases, "amount").notNull).toBe(true);
    expect(column(purchases, "currency").notNull).toBe(true);
    expect(column(purchases, "status").enumValues).toEqual([
      "pending",
      "paid",
      "refunded",
      "revoked",
    ]);
    expect(column(purchases, "purchased_at").notNull).toBe(true);

    expect(columnNames(lessonProgress)).toEqual([
      "id",
      "user_id",
      "lesson_id",
      "last_position_seconds",
      "max_watched_percentage",
      "completed_at",
      "completion_method",
      "created_at",
      "updated_at",
    ]);
    expect(column(lessonProgress, "user_id").getSQLType()).toBe("text");
    expect(column(lessonProgress, "last_position_seconds").getSQLType()).toBe(
      "integer",
    );
    expect(column(lessonProgress, "last_position_seconds").default).toBe(0);
    expect(column(lessonProgress, "max_watched_percentage").getSQLType()).toBe(
      "real",
    );
    expect(column(lessonProgress, "max_watched_percentage").default).toBe(0);
    expect(column(lessonProgress, "completed_at").notNull).toBe(false);
    expect(column(lessonProgress, "completion_method").enumValues).toEqual([
      "automatic",
      "manual",
    ]);
    expect(column(lessonProgress, "completion_method").notNull).toBe(false);
  });

  it("uses the approved role, provider, status, and completion unions", () => {
    expect(userRole).toEqual(["student", "admin"]);
    expect(lessonVideoProvider).toEqual([
      "youtube",
      "vimeo",
      "mux",
      "cloudflare_stream",
      "external",
    ]);
    expect(courseStatus).toEqual(["draft", "published", "archived"]);
    expect(purchaseStatus).toEqual(["pending", "paid", "refunded", "revoked"]);
    expect(completionMethod).toEqual(["automatic", "manual"]);

    expectTypeOf<(typeof userRole)[number]>().toEqualTypeOf<
      "student" | "admin"
    >();
    expectTypeOf<(typeof lessonVideoProvider)[number]>().toEqualTypeOf<
      | "youtube"
      | "vimeo"
      | "mux"
      | "cloudflare_stream"
      | "external"
    >();
    expectTypeOf<(typeof courseStatus)[number]>().toEqualTypeOf<
      "draft" | "published" | "archived"
    >();
    expectTypeOf<(typeof purchaseStatus)[number]>().toEqualTypeOf<
      "pending" | "paid" | "refunded" | "revoked"
    >();
    expectTypeOf<(typeof completionMethod)[number]>().toEqualTypeOf<
      "automatic" | "manual"
    >();
  });

  it("enforces required uniqueness and ordered curriculum constraints", () => {
    expect(indexes(courses)).toContainEqual({
      name: "courses_slug_uidx",
      unique: true,
      columns: ["slug"],
    });
    expect(indexes(modules)).toContainEqual({
      name: "modules_course_position_uidx",
      unique: true,
      columns: ["course_id", "position"],
    });
    expect(indexes(lessons)).toContainEqual({
      name: "lessons_slug_uidx",
      unique: true,
      columns: ["slug"],
    });
    expect(indexes(lessons)).toContainEqual({
      name: "lessons_module_position_uidx",
      unique: true,
      columns: ["module_id", "position"],
    });
    expect(indexes(purchases)).toContainEqual({
      name: "purchases_clerk_purchase_id_uidx",
      unique: true,
      columns: ["clerk_purchase_id"],
    });
    expect(indexes(lessonProgress)).toContainEqual({
      name: "lesson_progress_user_lesson_uidx",
      unique: true,
      columns: ["user_id", "lesson_id"],
    });
  });

  it("declares the required foreign keys and Drizzle relations", () => {
    expect(foreignKeys(modules)).toContainEqual({
      columns: ["course_id"],
      foreignTable: "courses",
      foreignColumns: ["id"],
      onDelete: "cascade",
    });
    expect(foreignKeys(lessons)).toContainEqual({
      columns: ["module_id"],
      foreignTable: "modules",
      foreignColumns: ["id"],
      onDelete: "cascade",
    });
    expect(foreignKeys(purchases)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          columns: ["user_id"],
          foreignTable: "users",
          foreignColumns: ["id"],
          onDelete: "cascade",
        }),
        expect.objectContaining({
          columns: ["course_id"],
          foreignTable: "courses",
          foreignColumns: ["id"],
          onDelete: "cascade",
        }),
      ]),
    );
    expect(foreignKeys(lessonProgress)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          columns: ["user_id"],
          foreignTable: "users",
          foreignColumns: ["id"],
          onDelete: "cascade",
        }),
        expect.objectContaining({
          columns: ["lesson_id"],
          foreignTable: "lessons",
          foreignColumns: ["id"],
          onDelete: "cascade",
        }),
      ]),
    );

    expectManyRelation(
      relationalTables.courses.relations.modules,
      "modules",
    );
    expectManyRelation(
      relationalTables.courses.relations.purchases,
      "purchases",
    );
    expectManyRelation(
      relationalTables.users.relations.purchases,
      "purchases",
    );
    expectManyRelation(
      relationalTables.users.relations.lessonProgress,
      "lesson_progress",
    );
    expectManyRelation(
      relationalTables.modules.relations.lessons,
      "lessons",
    );
    expectManyRelation(
      relationalTables.lessons.relations.lessonProgress,
      "lesson_progress",
    );
    expectOneRelation(
      relationalTables.modules.relations.course,
      "courses",
      ["course_id"],
      ["id"],
    );
    expectOneRelation(
      relationalTables.lessons.relations.module,
      "modules",
      ["module_id"],
      ["id"],
    );
    expectOneRelation(
      relationalTables.purchases.relations.user,
      "users",
      ["user_id"],
      ["id"],
    );
    expectOneRelation(
      relationalTables.purchases.relations.course,
      "courses",
      ["course_id"],
      ["id"],
    );
    expectOneRelation(
      relationalTables.lessonProgress.relations.user,
      "users",
      ["user_id"],
      ["id"],
    );
    expectOneRelation(
      relationalTables.lessonProgress.relations.lesson,
      "lessons",
      ["lesson_id"],
      ["id"],
    );
  });
});
