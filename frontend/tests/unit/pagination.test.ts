import { describe, expect, it } from "vitest";
import { pageItems } from "@/lib/pagination";

describe("pageItems (paginação numerada)", () => {
  it.each([
    [1, 1, [1]],
    [1, 2, [1, 2]],
    [2, 5, [1, 2, 3, 4, 5]],
    [1, 22, [1, 2, "gap", 22]],
    [5, 10, [1, "gap", 4, 5, 6, "gap", 10]],
    [3, 10, [1, 2, 3, 4, "gap", 10]],
    [10, 10, [1, "gap", 9, 10]],
    [4, 7, [1, 2, 3, 4, 5, 6, 7]],
  ])("página %i de %i → %j", (page, pages, expected) => {
    expect(pageItems(page, pages)).toEqual(expected);
  });
});
