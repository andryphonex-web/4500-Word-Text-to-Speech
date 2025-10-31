
export enum Mode {
  Single = 'single-speaker',
  Multi = 'multi-speaker',
}

export interface Speaker {
  id: string;
  name: string;
  voice: string;
}
