export interface Storyboard {
  count_frames: number;
  disk_space: number;
  step_y?: number;
  total_flight_time: number;
}

export interface Storyboards {
  point_based: Storyboard;
  recommended: Storyboard;
  optimal: Storyboard;
}