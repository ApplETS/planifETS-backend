

import { ICoursePlanification } from "@/common/website-helper/pdf/pdf-parser/planification/planification-cours.types";

// Extract only code and available fields from a course
export function mapCoursePlanification(c: ICoursePlanification) {
  return { code: c.code, available: c.available };
}

// Sort by course code
function sortByCode(a: { code: string }, b: { code: string }) {
  return a.code.localeCompare(b.code);
}

export function normalizeCourseArray(arr: Array<ICoursePlanification>) {
  return arr
    .map(mapCoursePlanification)
    .sort(sortByCode);
}
