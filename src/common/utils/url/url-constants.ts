/*
 * ETS website
 */
const ETS_BASE_URL = 'https://www.etsmtl.ca/';

export const ETS_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/*
 * ETS API
 */
const ETS_API_BASE_URL = `${ETS_BASE_URL}api/`;

export const ETS_API_GET_ALL_PROGRAMS = `${ETS_API_BASE_URL}search/programme-index`;
export const ETS_API_GET_COURSES_BY_IDS = `${ETS_API_BASE_URL}courses/get?ids=`;
export const ETS_API_GET_ALL_COURSES = `${ETS_API_BASE_URL}search/cours-index`;

export const getEtsCoursePageUrl = (courseCode: string): string => {
  return `${ETS_BASE_URL}etudes/cours/${courseCode.toLowerCase()}`;
};

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

/*
 * Cheminot
 */
export const CHEMINOT_JAR_URL = 'https://CheminotJWS.etsmtl.ca/ChemiNotC.jar';
export const CHEMINEMENTS_TXT_PATH = 'ressources/Cheminements.txt';

/*
 * PlanETS
 */
const PLANETS_BASE_URL = 'https://planets.etsmtl.ca/public/';

// ÉTS sessions: 1 = hiver (winter), 2 = été (summer), 3 = automne (fall)
const getCurrentEtsSessionCode = (date: Date = new Date()): number => {
  const month = date.getMonth(); // 0-11
  const session = month <= 3 ? 1 : month <= 7 ? 2 : 3;

  return date.getFullYear() * 10 + session;
};

export const getPlanetsCourseUrl = (
  courseCode: string,
  sessionCode: number = getCurrentEtsSessionCode(),
): string => {
  return `${PLANETS_BASE_URL}Versionpdf.aspx?session=${sessionCode}&sigle=${courseCode}`;
};
