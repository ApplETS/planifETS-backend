export interface HoraireCours {
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

export type Period = {
  [key: string]: string;
};
