"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
import {
  MAX_CATALOG_SEARCH_LENGTH,
  normalizeCatalogSearch,
} from "@/src/lib/validation/catalog-search";

const ALL_CATEGORIES = "all";

export function CourseFilters({ categories }: { categories: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") ?? "";
  const initialCategory = searchParams.get("category") ?? ALL_CATEGORIES;
  const [search, setSearch] = useState(initialSearch);
  const [error, setError] = useState<string | null>(null);

  const updateUrl = (nextSearch: string, nextCategory: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextSearch) {
      params.set("q", nextSearch);
    } else {
      params.delete("q");
    }

    if (nextCategory && nextCategory !== ALL_CATEGORIES) {
      params.set("category", nextCategory);
    } else {
      params.delete("category");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedSearch = normalizeCatalogSearch(search);

    if (normalizedSearch === null) {
      setError(`Use ${MAX_CATALOG_SEARCH_LENGTH} characters or fewer.`);
      return;
    }

    setError(null);
    updateUrl(normalizedSearch, initialCategory);
  };

  return (
    <form
      role="search"
      aria-label="Filter courses"
      className="grid gap-5 border-y border-foreground/20 py-6 md:grid-cols-[minmax(0,1fr)_16rem_auto] md:items-end"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-2">
        <Label htmlFor="catalog-search">Search courses</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="catalog-search"
            name="q"
            type="search"
            value={search}
            maxLength={MAX_CATALOG_SEARCH_LENGTH}
            placeholder="Search by title or subject"
            className="h-11 pl-9"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="catalog-category">Focus area</Label>
        <Select
          value={initialCategory}
          onValueChange={(value) => {
            updateUrl(normalizeCatalogSearch(search) ?? "", value);
          }}
        >
          <SelectTrigger id="catalog-category" className="h-11 w-full">
            <SelectValue placeholder="All focus areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All focus areas</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category.toLocaleLowerCase("en")}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" size="lg" className="h-11 md:min-w-28">
        Apply filters
      </Button>

      {error ? (
        <p role="alert" className="text-sm text-destructive md:col-span-3">
          {error}
        </p>
      ) : null}
    </form>
  );
}
