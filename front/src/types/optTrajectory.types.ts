export interface Point {
  x: number;
  y: number;
  time: number;
}

export interface Taxon {
  region: number;
  base: Point;
  points: Point[];
  time_sec: number;
  route: Point[];
  warning: string;
  color: string;
}

export interface Opt1TrajectoryData {
  N_k: number;
  B: Taxon[];
  C: number[];
}
