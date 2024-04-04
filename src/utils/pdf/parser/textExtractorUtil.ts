import { Text } from 'pdf2json';

export class TextExtractor {
  public static extractTextDetails(textItem: Text): {
    fontSize: number;
    textContent: string;
    xPos: number;
    yPos: number;
    bold: boolean;
  } {
    const textContent: string = decodeURIComponent(textItem.R[0].T).trim();
    const fontSize: number = textItem.R[0].TS[1];
    const xPos: number = textItem.x;
    const yPos: number = textItem.y;
    const bold: boolean = textItem.R[0].TS[2] === 1;

    return { textContent, fontSize, xPos, yPos, bold };
  }
}
