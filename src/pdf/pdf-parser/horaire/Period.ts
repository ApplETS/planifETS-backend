interface IPeriod {
  day: string;
  time: string;
  activity: string;
  teacher: string;
  local: string;
  mode: string;
  dateRange: string;
}

export class Period implements IPeriod {
  public static readonly JOUR_X_AXIS = 5.447;

  constructor(
    public day: string = '',
    public time: string = '',
    public activity: string = '',
    public teacher: string = '',
    public local: string = '',
    public mode: string = '',
    public dateRange: string = '',
  ) {}

  public static isPeriodEmpty(period: Period): boolean {
    return !Object.values(period).some(
      (value) => value !== '' && value != null,
    );
  }

  public handlePeriodDetailTypes(text: string) {
    if (!this) return;

    const detailType = this.getPeriodDetailType(text);

    if (!detailType) return;

    this[detailType] = text as (typeof this)[typeof detailType];
  }

  public getPeriodDetailType(text: string): keyof this | undefined {
    if (Period.isDay(text)) {
      return 'day';
    } else if (/^\d{2}:\d{2} - \d{2}:\d{2}$/.test(text)) {
      return 'time';
    } else if (/^(\p{L}\.)+\s.+$/u.test(text)) {
      return 'teacher';
    } else if (/[A-Z]-\d{4}/.test(text)) {
      return 'local';
    } else if (
      /(Labo A|Labo B|Labo C|Labo D|Labo(?: A\+B)?|Labo\/2|\bC\b|Atelier|TP\/Labo|TP\/2|TP(?: A\+B| A| B| C| D)?|TP-Labo\/2|TP-Labo (?:A|B|C|D)|Projet)/.test(
        text,
      )
    ) {
      return 'activity';
    } else if (/^(P|D|C|H)$/.test(text)) {
      return 'mode';
    } else if (
      /\b(?:1er|0?[1-9]|[12][0-9]|3[01])\s(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s\d{4}\b/.test(
        text,
      )
    ) {
      return 'dateRange';
    }
  }

  public static isDay(text: string): boolean {
    return /^(Lun|Mar|Mer|Jeu|Ven|Sam|Dim)$/.test(text);
  }

  public serialize(): IPeriod {
    return {
      day: this.day,
      time: this.time,
      activity: this.activity,
      teacher: this.teacher,
      local: this.local,
      mode: this.mode,
      dateRange: this.dateRange,
    };
  }
}
