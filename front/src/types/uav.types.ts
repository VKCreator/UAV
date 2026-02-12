export interface DroneParams {
  /** ID выбранного БПЛА */
  selectedDroneId?: string | number;

  model: string;

  /** Размер кадра базовый (м) */
  frameWidthBase: number;
  frameHeightBase: number;

  /** Размер кадра планируемый (м) */
  frameWidthPlanned: number;
  frameHeightPlanned: number;

  /** Дистанция съёмки базового слоя (м) */
  distance: number;

  /** Планируемая дистанция съёмки (м) */
  plannedDistance: number;

  /** Параметры камеры БПЛА */
  uavParams: UAVCameraParams;

  speed: number;

  batteryTime: number;

  hoverTime: number;

  windResistance: number;

  considerObstacles: boolean;
}

export interface UAVCameraParams {
  /** Вертикальный угол обзора камеры (градусы) */
  fov: number;

  /** Разрешение матрицы */
  resolutionWidth: number;
  resolutionHeight: number;

  /** Использовать параметры из справочника */
  useFromReference: boolean;
}

export interface GPSCoordinate {
  lat: number; // широта
  lon: number; // долгота
}

export interface Weather {
  windSpeed: number;
  windDirection: number;

  position: GPSCoordinate;
  useWeatherApi: boolean;
}

// Для диалогового окна
export interface FlightSettings {
  flightSpeed: number;
  batteryTime: number;
  hoverTime: number;
  windResistance: number;
  considerObstacles: boolean;
  windSpeed: number;
  windDirection: number;
  useWeatherApi: boolean;
  lat: number;
  lon: number;
  model: string;
}
