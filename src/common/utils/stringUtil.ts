export function extractNumberFromString(cycle: string): number {
  const match = RegExp(/\d+/).exec(cycle);

  return match ? parseInt(match[0], 10) : 0;
}
