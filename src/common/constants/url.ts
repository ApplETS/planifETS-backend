export const ETS_BASE_URL = 'http://www.etsmtl.ca/';

/*
 * ETS website
 */
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
