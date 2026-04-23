// NavigationTriangles.tsx
import { Fragment } from "react";
import { Arrow, Line } from "react-konva";

interface NavigationTrianglesProps {
  segments: any[];
  meterPerPixelX: number;
  meterPerPixelY: number;
  imageHeight: number;
  scaleToFit: number;
  imageX: number;
  imageY: number;
  taxonIdx: number;
}

const NavigationTriangles = ({
  segments,
  meterPerPixelX,
  meterPerPixelY,
  imageHeight,
  scaleToFit,
  imageX,
  imageY,
  taxonIdx,
}: NavigationTrianglesProps) => {
  const navAngleToCanvasVec = (angleDeg: number, magnitude: number, distMeters: number) => {
    const rad = angleDeg * Math.PI / 180;
    const dirX = Math.sin(rad);
    const dirY = -Math.cos(rad);

    const triangleSizeMeters = distMeters;
    const rawSizePxX = (triangleSizeMeters / meterPerPixelX) * scaleToFit;
    const rawSizePxY = (triangleSizeMeters / meterPerPixelY) * scaleToFit;

    const rawMagnitude = Math.hypot(rawSizePxX, rawSizePxY);
    const MIN_PX = 10;
    const MAX_PX = 15;
    const clampedMagnitude = Math.min(Math.max(rawMagnitude, MIN_PX), MAX_PX);
    const scale = clampedMagnitude / (rawMagnitude || 1);

    return {
      x: dirX * magnitude * rawSizePxX * scale,
      y: dirY * magnitude * rawSizePxY * scale
    };
  };

  return (
    <>
      {segments.map((segment: any, segIdx: number) => {
        const pFrom = segment.p_from;
        const pTo = segment.p_to;

        let TC = segment.TC;
        if (typeof TC === 'object' && TC !== null) {
          TC = TC.parsedValue ?? TC.source ?? 0;
        }
        const TA = segment.TA;
        const GS = segment.GS;
        const TAS = segment.TAS;
        const windSpeed = segment.wind_speed;
        const windDirDeg = segment.wind_dir_deg;

        const windTo = (windDirDeg + 180) % 360;
        const distMeters = Math.hypot(pTo[0] - pFrom[0], pTo[1] - pFrom[1]);

        const fromX_px = pFrom[0] / meterPerPixelX;
        const fromY_px = imageHeight - pFrom[1] / meterPerPixelY;
        const triStartX = fromX_px * scaleToFit + imageX;
        const triStartY = fromY_px * scaleToFit + imageY;

        const gsVec = navAngleToCanvasVec(TC, GS, distMeters);
        const tasVec = navAngleToCanvasVec(TA, TAS, distMeters);
        const windVec = navAngleToCanvasVec(windTo, windSpeed, distMeters);

        return (
          <Fragment key={`nav-triangle-${taxonIdx}-${segIdx}`}>
            <Arrow
              points={[triStartX, triStartY, triStartX + gsVec.x, triStartY + gsVec.y]}
              pointerLength={8}
              pointerWidth={5}
              fill="red"
              stroke="red"
              strokeWidth={1.5}
              opacity={0.9}
            />
            <Arrow
              points={[triStartX, triStartY, triStartX + tasVec.x, triStartY + tasVec.y]}
              pointerLength={8}
              pointerWidth={5}
              fill="blue"
              stroke="blue"
              strokeWidth={2.5}
              opacity={0.9}
            />
            <Arrow
              points={[triStartX, triStartY, triStartX + windVec.x, triStartY + windVec.y]}
              pointerLength={8}
              pointerWidth={5}
              fill="green"
              stroke="green"
              strokeWidth={2.5}
              opacity={0.8}
            />
            <Line
              points={[
                triStartX + windVec.x, triStartY + windVec.y,
                triStartX + windVec.x + tasVec.x, triStartY + windVec.y + tasVec.y,
              ]}
              stroke="blue"
              strokeWidth={1.5}
              dash={[6, 4]}
              opacity={1}
            />
            <Line
              points={[
                triStartX + tasVec.x, triStartY + tasVec.y,
                triStartX + tasVec.x + windVec.x, triStartY + tasVec.y + windVec.y,
              ]}
              stroke="green"
              strokeWidth={1.5}
              dash={[6, 4]}
              opacity={1}
            />
          </Fragment>
        );
      })}
    </>
  );
};

export default NavigationTriangles;