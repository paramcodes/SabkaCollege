export function formatCoursePrice(
  priceAmount: number,
  currency: string,
  locale = "en-IN",
) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(priceAmount / 100);
  } catch {
    return "See course price";
  }
}
