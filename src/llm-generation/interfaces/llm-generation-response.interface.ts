export interface LlmCourse {
  code: string;
}

export interface LlmGenerationResponse {
  courses: LlmCourse[];
  explanation: string;
}
