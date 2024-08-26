import { IPeriod, Period } from './Period';

export interface IGroup {
  periods: IPeriod[];
}

export class Group implements IGroup {
  private static readonly GROUP_X_AXIS = 3.886;

  public periods: Period[] = [];

  constructor() {
    this.periods = [];
  }

  public addPeriods(newPeriods: Period[]): void {
    newPeriods.forEach((period) => {
      if (!this.isPeriodExists(period) && !Period.isPeriodEmpty(period)) {
        this.periods.push(period);
      }
    });
  }

  public isPeriodExists(period: Period): boolean {
    return this.periods.some(
      (existingPeriod) =>
        JSON.stringify(existingPeriod) === JSON.stringify(period),
    );
  }

  public static isGroupNumber(text: string, xPos: number) {
    return xPos === this.GROUP_X_AXIS && /^\d{2}$/.test(text);
  }

  public serialize(): IGroup {
    return {
      periods: this.periods.map((period: Period) => period.serialize()),
    };
  }
}
