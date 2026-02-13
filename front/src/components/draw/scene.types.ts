export interface Point {
  x: number;
  y: number;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  color: string;
}

export interface Polygon {
  id: string;
  points: Point[];
  color: string;
}

export interface ImageData {
  imageUrl: string;
  fileName: string;
  width: number;
  height: number;
}