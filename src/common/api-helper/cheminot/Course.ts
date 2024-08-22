export class Course {
  constructor(
    public type: string,
    public session: number,
    public code: string,
    public profile: string,
    public concentration: string,
    public category: string,
    public level: string,
    public mandatory: boolean,
    public prerequisites: string[],
  ) {}

  public static parsePrerequisites(prerequisitesString: string): string[] {
    if (!prerequisitesString) return [];
    return prerequisitesString
      .split(' & ')
      .map((prerequisite) => prerequisite.trim());
  }
}
