import { cache } from "react";
import type {
  PublicLibraryDetail,
  PublicLibraryItem,
  PublicPage,
} from "@esapiens/contracts";
import { isPublicPage, isRecord, readPublicApi } from "@/shared/api/public-api";

function isLibraryItem(value: unknown): value is PublicLibraryItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    ["libro", "articulo", "guia", "video"].includes(String(value.type)) &&
    (value.publisher === null || typeof value.publisher === "string") &&
    (value.isbn === null || typeof value.isbn === "string") &&
    (value.year === null || typeof value.year === "number") &&
    Array.isArray(value.authors) &&
    value.authors.every((author: unknown) => typeof author === "string")
  );
}
function isLibraryDetail(value: unknown): value is PublicLibraryDetail {
  if (!isRecord(value) || !isLibraryItem(value)) return false;
  return (
    Array.isArray(value.sections) &&
    value.sections.every(
      (section: unknown) =>
        isRecord(section) &&
        typeof section.title === "string" &&
        (section.pageStart === null || typeof section.pageStart === "number") &&
        (section.pageEnd === null || typeof section.pageEnd === "number"),
    )
  );
}
export function getLibrary(query: string) {
  return readPublicApi(
    `/library?${query}`,
    (value): value is PublicPage<PublicLibraryItem> =>
      isPublicPage(value, isLibraryItem),
  );
}
export const getLibraryItem = cache(async (id: string) => {
  return readPublicApi(`/library/${encodeURIComponent(id)}`, isLibraryDetail);
});
