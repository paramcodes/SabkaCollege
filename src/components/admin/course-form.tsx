"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { saveCourse } from "@/src/actions/admin-courses";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";

export type CourseFormValues = {
  id?: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  coverImageUrl: string;
  status: "draft" | "published" | "archived";
  priceAmount: number;
  currency: string;
  stripeProductId: string;
  stripePriceId: string;
  estimatedDurationMinutes: number;
};

type FormState = { error: string | null };

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

export function CourseForm({ course }: { course?: CourseFormValues }) {
  const router = useRouter();
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_previous, formData) => {
      const result = await saveCourse({
        id: course?.id,
        slug: text(formData, "slug"),
        title: text(formData, "title"),
        shortDescription: text(formData, "shortDescription") || null,
        description: text(formData, "description"),
        coverImageUrl: text(formData, "coverImageUrl") || null,
        status: text(formData, "status") as CourseFormValues["status"],
        priceAmount: Number(text(formData, "priceAmount")),
        currency: text(formData, "currency"),
        stripeProductId: text(formData, "stripeProductId") || null,
        stripePriceId: text(formData, "stripePriceId") || null,
        estimatedDurationMinutes: Number(
          text(formData, "estimatedDurationMinutes"),
        ),
      });

      if (!result.ok) return { error: result.error.message };
      if (!course?.id) setCreatedId(result.data.id);
      return { error: null };
    },
    { error: null },
  );

  useEffect(() => {
    if (createdId) router.push(`/admin/courses/${createdId}/edit`);
  }, [createdId, router]);

  return (
    <form action={formAction} className="grid gap-6" aria-label="Course details">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="course-title">Title</Label>
          <Input
            id="course-title"
            name="title"
            required
            maxLength={200}
            defaultValue={course?.title}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="course-slug">Slug</Label>
          <Input
            id="course-slug"
            name="slug"
            required
            maxLength={160}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            defaultValue={course?.slug}
            aria-describedby="course-slug-help"
          />
          <p id="course-slug-help" className="text-xs text-muted-foreground">
            Lowercase letters, numbers, and single hyphens.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="course-short-description">Short description</Label>
        <Input
          id="course-short-description"
          name="shortDescription"
          maxLength={500}
          defaultValue={course?.shortDescription}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="course-description">Description</Label>
        <Textarea
          id="course-description"
          name="description"
          required
          rows={7}
          defaultValue={course?.description}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="course-cover">Cover image URL</Label>
        <Input
          id="course-cover"
          name="coverImageUrl"
          type="url"
          defaultValue={course?.coverImageUrl}
        />
      </div>

      <fieldset className="grid gap-4 rounded-lg border p-4">
        <legend className="px-1 font-medium">Pricing and configuration</legend>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="course-status">Status</Label>
            <Select name="status" defaultValue={course?.status ?? "draft"}>
              <SelectTrigger id="course-status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="course-price">Price (minor units)</Label>
            <Input
              id="course-price"
              name="priceAmount"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={course?.priceAmount ?? 0}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="course-currency">Currency</Label>
            <Input
              id="course-currency"
              name="currency"
              required
              minLength={3}
              maxLength={3}
              pattern="[A-Za-z]{3}"
              defaultValue={course?.currency ?? "INR"}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="course-duration">Estimated minutes</Label>
            <Input
              id="course-duration"
              name="estimatedDurationMinutes"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={course?.estimatedDurationMinutes ?? 0}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="stripe-product">Stripe product ID</Label>
            <Input
              id="stripe-product"
              name="stripeProductId"
              defaultValue={course?.stripeProductId}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="stripe-price">Stripe price ID</Label>
            <Input
              id="stripe-price"
              name="stripePriceId"
              defaultValue={course?.stripePriceId}
              autoComplete="off"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Stripe values are identifiers only. Never paste secret keys or webhook
          payloads here.
        </p>
      </fieldset>

      {state.error ? (
        <p role="alert" className="border border-destructive/40 p-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : course?.id ? "Save course" : "Create draft"}
        </Button>
      </div>
    </form>
  );
}
