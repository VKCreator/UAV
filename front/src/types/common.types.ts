export interface ExifData {
  fileName: string;
  fileSize: string;
  width?: number;
  height?: number;
  dateTime?: string;
  make?: string;
  model?: string;
  orientation?: number;
  xResolution?: number;
  yResolution?: number;
  resolutionUnit?: number;
  software?: string;
  artist?: string;
  copyright?: string;
  focalLength: number;
  focalLengthIn35mmFormat: number;
  latitude: string;
  longitude: string;
}