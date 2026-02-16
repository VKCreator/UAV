export interface Storyboard {
  count_frames: number | null;
  disk_space: number | null;
  step_y?: number;
  step_x?: number;
  total_flight_time: number | null;
  applied: boolean;
}

export interface Storyboards {
  point: Storyboard;
  recommended: Storyboard;
  optimal: Storyboard;
}
