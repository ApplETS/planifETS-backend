/*
 * ETS website
 */
export const ETS_BASE_URL = 'https://www.etsmtl.ca/';
export const PROGRAM_BASE_URL = `${ETS_BASE_URL}etude/`;
export const COURSE_BASE_URL = `${ETS_BASE_URL}cours/`;

/*
 * ETS API
 */
export const ETS_API_BASE_URL = `${ETS_BASE_URL}api/`;

export const ETS_API_GET_ALL_PROGRAMS = `${ETS_API_BASE_URL}search/programme-index`;
export const ETS_API_GET_COURSES_BY_IDS = `${ETS_API_BASE_URL}courses/get?ids=`;
export const ETS_API_GET_ALL_COURSES = `${ETS_API_BASE_URL}search/cours-index`;

export const ETS_API_GET_ALL_DEPARTEMENTS = `${ETS_API_BASE_URL}search?s="departement="`;

/*
 * PDF
 */
export const getPlanificationPdfUrl = (programCode: string): string => {
  return `https://horaire.etsmtl.ca/Horairepublication/Planification-${programCode}.pdf`;
};

export const getHorairePdfUrl = (
  sessionCode: string,
  programCode: string,
): string => {
  return `https://horaire.etsmtl.ca/HorairePublication/HorairePublication_${sessionCode}_${programCode}.pdf`;
};
