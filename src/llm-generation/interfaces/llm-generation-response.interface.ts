export interface LlmCourse {
  code: string;
  reason?: string;
}

export interface LlmGenerationResponse {
  courses: LlmCourse[];
  explanation: string;
}
