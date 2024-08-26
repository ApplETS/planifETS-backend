export class Row {
  constructor(
    public id: number,
    public headerName: string,
    public startX: number,
    public endX: number,
  ) {
    this.id = id;
    this.headerName = this.determineHeaderName(id, headerName);
    this.startX = this.truncateToFiveDecimals(startX);
    this.endX = this.truncateToFiveDecimals(endX);
  }

  private truncateToFiveDecimals(num: number) {
    return Math.floor(num * 100000) / 100000;
  }

  private determineHeaderName(id: number, headerName: string): string {
    switch (id) {
      case 0:
        return 'code';
      case 1:
        return 'title';
      default:
        return headerName;
    }
  }

  public static getColumnHeaderName(
    columns: Row[],
    x: number,
  ): Row | undefined {
    return columns.find((column) => x >= column.startX && x <= column.endX);
  }
}
