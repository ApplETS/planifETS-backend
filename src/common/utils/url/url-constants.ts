/*
 * ETS website
 */
const ETS_BASE_URL = 'https://www.etsmtl.ca/';

/*
 * ETS API
 */
const ETS_API_BASE_URL = `${ETS_BASE_URL}api/`;

export const ETS_API_GET_ALL_PROGRAMS = `${ETS_API_BASE_URL}search/programme-index`;
export const ETS_API_GET_COURSES_BY_IDS = `${ETS_API_BASE_URL}courses/get?ids=`;
export const ETS_API_GET_ALL_COURSES = `${ETS_API_BASE_URL}search/cours-index`;

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
