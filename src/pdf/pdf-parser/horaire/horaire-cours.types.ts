import { Group } from './Group';

export interface IHoraireCours {
  code: string;
  title: string;
  prerequisites: string;
  groups: Map<string, Group>;
}
