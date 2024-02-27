export interface Course {
  code: string;
  // Add any other common properties here
}

export interface HoraireCourse {
  code: string;
  title: string;
  prerequisites: string;
  groups: Group;
}

interface Group {
  [groupNumber: string]: GroupPeriod[];
}

export interface GroupPeriod {
  day?: string;
  time?: string;
  activity?: string;
  mode?: string;
  teacher?: string;
  dateRange?: string;
  local?: string;
}

export type HorairePeriod = {
  [key: string]: string;
};

export interface PlanificationCourse {
  code: string;
  available: Record<string, string>;
}

//Planification pdf, header row
export class Column {
  constructor(
    public id: number,
    public headerName: string,
    public startX: number,
    public endX: number,
    public startY?: number,
    public endY?: number,
  ) {
    this.id = id;
    this.headerName = headerName;
    this.startX = this.roundToLowerNumber(startX);
    this.endX = this.roundToLowerNumber(endX);

    if (id === 0) {
      this.headerName = 'code';
    } else if (id === 1) {
      this.headerName = 'title';
    }
  }

  private roundToLowerNumber(num) {
    return Math.floor(num * 100000) / 100000;
  }
}
