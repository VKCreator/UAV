import React, { Fragment } from "react";
import { Layer, Image as KonvaImage, Circle, Text, Arrow, Line, Rect, Group } from "react-konva";
import { Point, Polygon, TrajectoryPoint } from "../../../types/scene.types";
import { convexHull, outwardUnitNormal } from "../utils/Geometry";

const TAXON_POINT_RADIUS = 12;
const BASE_RADIUS = 4;
const POINT_RADIUS = 14;

// Вспомогательная функция
const getArrowPoints = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromRadius: number,
  toRadius: number,
) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return [from.x, from.y, to.x, to.y];
  const ux = dx / length;
  const uy = dy / length;
  return [
    from.x + ux * fromRadius,
    from.y + uy * fromRadius,
    to.x - ux * toRadius,
    to.y - uy * toRadius,
  ];
};

//  СТАТИЧЕСКИЙ СЛОЙ 
interface StaticLayerProps {
  image: HTMLImageElement | null;
  imageX: number;
  imageY: number;
  scaleToFit: number;
  gridLines: JSX.Element[];
  handleClick: (e: any) => void;
  STAGE_WIDTH: number;
  STAGE_HEIGHT: number;
}

export const StaticLayer = React.memo(({
  image,
  imageX,
  imageY,
  scaleToFit,
  gridLines,
  handleClick,
  STAGE_WIDTH,
  STAGE_HEIGHT
}: StaticLayerProps) => {
  if (!STAGE_WIDTH || !STAGE_HEIGHT || STAGE_WIDTH <= 0 || STAGE_HEIGHT <= 0) {
    return null;
  }
  return (
    <Layer>
      {image ? (
        <>
          <KonvaImage
            image={image}
            x={imageX}
            y={imageY}
            scaleX={scaleToFit}
            scaleY={scaleToFit}
            onClick={handleClick}
          />
          {gridLines}
        </>
      ) : (
        <>
          <Rect x={0} y={0} width={STAGE_WIDTH} height={STAGE_HEIGHT} fill="rgba(255,255,255,0.7)" />
          <Text
            x={0}
            y={0}
            width={STAGE_WIDTH}
            height={STAGE_HEIGHT}
            text="Загрузка..."
            fontSize={20}
            fill="black"
            align="center"
            verticalAlign="middle"
          />
        </>
      )}
    </Layer>
  );
});

//  СЛОЙ ВЫДЕЛЕНИЯ 
interface SelectionLayerProps {
  selection: { x: number; y: number; width: number; height: number } | null;
  scaleToFit: number;
  imageX: number;
  imageY: number;
  isVisible: boolean;
}

export const SelectionLayer = React.memo(({
  selection,
  scaleToFit,
  imageX,
  imageY,
  isVisible
}: SelectionLayerProps) => {
  if (!isVisible || !selection) return null;

  return (
    <Layer>
      <Rect
        x={selection.x * scaleToFit + imageX}
        y={selection.y * scaleToFit + imageY}
        width={selection.width * scaleToFit}
        height={selection.height * scaleToFit}
        stroke="orange"
        strokeWidth={2}
        dash={[6, 4]}
        fill="#FF800022"
      />
    </Layer>
  );
});

//  СЛОЙ ПОЛЬЗОВАТЕЛЬСКИХ ТОЧЕК 
interface UserPointsLayerProps {
  points: Point[];
  showPoints: boolean;
  scaleToFit: number;
  imageX: number;
  imageY: number;
  frameWidthPx: number;
  frameHeightPx: number;
  applyPointBasedStoryboard: boolean;
  image: HTMLImageElement | null;
}

export const UserPointsLayer = React.memo(({
  points,
  showPoints,
  scaleToFit,
  imageX,
  imageY,
  frameWidthPx,
  frameHeightPx,
  applyPointBasedStoryboard,
  image
}: UserPointsLayerProps) => {
  if (!showPoints || !image) return null;

  return (
    <Layer>
      {/* Стрелки между точками */}
      {points.length > 1 && points.map((p, i) => {
        if (i === 0) return null;
        const prev = points[i - 1];
        return (
          <Arrow
            key={`arrow-${i}`}
            points={getArrowPoints(
              { x: prev.x * scaleToFit + imageX, y: prev.y * scaleToFit + imageY },
              { x: p.x * scaleToFit + imageX, y: p.y * scaleToFit + imageY },
              POINT_RADIUS,
              POINT_RADIUS,
            )}
            pointerLength={10}
            pointerWidth={7}
            stroke="red"
            fill="red"
            strokeWidth={2}
          />
        );
      })}

      {/* Точки с номерами и кадрами */}
      {points.map((p, i) => {
        const x = p.x * scaleToFit + imageX;
        const y = p.y * scaleToFit + imageY;
        const scaledFrameWidth = frameWidthPx * scaleToFit;
        const scaledFrameHeight = frameHeightPx * scaleToFit;

        return (
          <Fragment key={`p-${i}`}>
            {applyPointBasedStoryboard && (
              <Rect
                x={x - scaledFrameWidth / 2}
                y={y - scaledFrameHeight / 2}
                width={scaledFrameWidth}
                height={scaledFrameHeight}
                stroke="black"
                strokeWidth={2}
                fill="#e54d4d5e"
              />
            )}
            <Circle x={x} y={y} radius={POINT_RADIUS} fill="blue"             stroke="white"
            strokeWidth={1} />
            <Text
              x={x - POINT_RADIUS}
              y={y - POINT_RADIUS}
              width={POINT_RADIUS * 2}
              height={POINT_RADIUS * 2}
              text={`${i + 1}`}
              fontSize={POINT_RADIUS}
              fontStyle="bold"
              fill="white"
              align="center"
              verticalAlign="middle"
            />
          </Fragment>
        );
      })}
    </Layer>
  );
});

//  СЛОЙ ПРЕПЯТСТВИЙ 
interface ObstaclesLayerProps {
  obstacles: Polygon[];
  showObstacles: boolean;
  scaleToFit: number;
  imageX: number;
  imageY: number;
  image: HTMLImageElement | null;
  pxPerMeterX?: number,
  pxPerMeterY?: number
}

export const ObstaclesLayer = React.memo(({
  obstacles,
  showObstacles,
  scaleToFit,
  imageX,
  imageY,
  image,
  pxPerMeterX = 1,
  pxPerMeterY = 1
}: ObstaclesLayerProps) => {
  if (!showObstacles || !image) return null;

  // Строит безопасную зону: делает полигон выпуклым, затем сдвигает
  // каждое ребро наружу на metersToExpand метров.
  const buildSafeZone = (poly: Polygon, metersToExpand: number): Point[] => {
    if (!poly.points || poly.points.length < 3) return poly.points ?? [];

    // Работаем НАПРЯМУЮ с пиксельными координатами
    const hull = convexHull(poly.points);
    if (hull.length < 3 || !metersToExpand) {
      return hull;
    }

    const centroid: Point = {
      x: hull.reduce((s, p) => s + p.x, 0) / hull.length,
      y: hull.reduce((s, p) => s + p.y, 0) / hull.length,
    };

    // Расширение в пикселях: metersToExpand * pxPerMeter
    const expandPixels = metersToExpand * ((pxPerMeterX + pxPerMeterY) / 2);
    
    const n = hull.length;
    const expanded: Point[] = hull.map((v, i) => {
      const prev = hull[(i - 1 + n) % n];
      const next = hull[(i + 1) % n];
      const nIn = outwardUnitNormal(prev, v, centroid);
      const nOut = outwardUnitNormal(v, next, centroid);
      const denom = 1 + nIn.x * nOut.x + nIn.y * nOut.y;
      if (Math.abs(denom) < 1e-9) {
        return {
          x: v.x + expandPixels * nIn.x,
          y: v.y + expandPixels * nIn.y,
        };
      }
      const factor = expandPixels / denom;
      return {
        x: v.x + factor * (nIn.x + nOut.x),
        y: v.y + factor * (nIn.y + nOut.y),
      };
    });

    return expanded;
  };

  return (
    <Layer>
      {obstacles.map((poly: Polygon, index: number) => {
        const safeZonePoints = buildSafeZone(poly, poly.safeZone);

        const centerX =
          poly.points.reduce((s, p) => s + p.x, 0) / poly.points.length;
        const centerY =
          poly.points.reduce((s, p) => s + p.y, 0) / poly.points.length;
        const labelX = centerX * scaleToFit + imageX;
        const labelY = centerY * scaleToFit + imageY;
        const labelText = String(index + 1);

        return (
          <Fragment key={poly.id}>
            <Line
              points={safeZonePoints.flatMap((p) => [
                p.x * scaleToFit + imageX,
                p.y * scaleToFit + imageY,
              ])}
              closed
              fill="#E0F4FF"
              stroke="#4FC3F7"
              strokeWidth={2}
              dash={[8, 4]}
              opacity={0.8}
              listening={false}
            />
            <Line
              points={poly.points.flatMap((p) => [
                p.x * scaleToFit + imageX,
                p.y * scaleToFit + imageY,
              ])}
              closed
              fill={`${poly.color}20`}
              stroke={poly.color}
              strokeWidth={2}
            />

            {poly.points.map((point, vIdx) => (
              <Circle
                key={`${poly.id}-vertex-${vIdx}`}
                x={point.x * scaleToFit + imageX}
                y={point.y * scaleToFit + imageY}
                radius={3}
                fill={poly.color}
              />
            ))}

            {/* Номер препятствия в центре полигона */}
            <Circle
              x={labelX}
              y={labelY}
              radius={15}
              fill="rgba(0,0,0,0.8)"
              listening={false}
            />
            <Text
              x={labelX - 15}
              y={labelY - 15}
              text={labelText}
              fontSize={15}
              fontStyle="bold"
              fill="#fff"
              align="center"
              verticalAlign="middle"
              height={15 * 2}
              width={15 * 2} 
              listening={false}
            />
          </Fragment>
        );
      })}
    </Layer>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.obstacles === nextProps.obstacles &&
    prevProps.showObstacles === nextProps.showObstacles &&
    prevProps.scaleToFit === nextProps.scaleToFit
  );
});

//  СЛОЙ РЕКОМЕНДУЕМОЙ РАСКАДРОВКИ 
interface RecommendedLayerProps {
  pointsRecommended: Point[];
  applyRecommendedStoryboard: boolean;
  scaleToFit: number;
  imageX: number;
  imageY: number;
  frameWidthPx: number;
  frameHeightPx: number;
  image: HTMLImageElement | null;
}

export const RecommendedLayer = React.memo(({
  pointsRecommended,
  applyRecommendedStoryboard,
  scaleToFit,
  imageX,
  imageY,
  frameWidthPx,
  frameHeightPx,
  image
}: RecommendedLayerProps) => {
  if (!applyRecommendedStoryboard || !image) return null;

  return (
    <Layer>
      {/* Путь змейкой */}
      {pointsRecommended.length > 1 && pointsRecommended.map((r, i) => {
        if (i === pointsRecommended.length - 1) return null;
        const next = pointsRecommended[i + 1];
        return (
          <Arrow
            key={`snake-arrow-${i}`}
            points={getArrowPoints(
              { x: r.x * scaleToFit + imageX, y: r.y * scaleToFit + imageY },
              { x: next.x * scaleToFit + imageX, y: next.y * scaleToFit + imageY },
              TAXON_POINT_RADIUS,
              TAXON_POINT_RADIUS,
            )}
            stroke="blue"
            fill="blue"
            strokeWidth={2}
            pointerLength={10}
            pointerWidth={7}
          />
        );
      })}

      {/* Точки с кадрами */}
      {pointsRecommended.map((r, i) => (
        <Fragment key={`grid-${i}`}>
          <Rect
            x={r.x * scaleToFit + imageX - (frameWidthPx * scaleToFit) / 2}
            y={r.y * scaleToFit + imageY - (frameHeightPx * scaleToFit) / 2}
            width={frameWidthPx * scaleToFit}
            height={frameHeightPx * scaleToFit}
            stroke="#000000"
            strokeWidth={2}
            fill="#2ef37063"
          />
          <Circle
            x={r.x * scaleToFit + imageX}
            y={r.y * scaleToFit + imageY}
            radius={TAXON_POINT_RADIUS}
            fill="red"
            stroke="#ffffff"
            strokeWidth={1}
          />
          <Text
            x={r.x * scaleToFit + imageX - TAXON_POINT_RADIUS}
            y={r.y * scaleToFit + imageY - TAXON_POINT_RADIUS}
            width={TAXON_POINT_RADIUS * 2}
            height={TAXON_POINT_RADIUS * 2}
            text={`${i + 1}`}
            fontSize={TAXON_POINT_RADIUS}
            fontStyle="bold"
            fill="white"
            align="center"
            verticalAlign="middle"
          />
        </Fragment>
      ))}
    </Layer>
  );
});

//  СЛОЙ ОПТИМАЛЬНОЙ ТРАЕКТОРИИ 
interface TrajectoryLayerProps {
  trajectoryData: any;
  showTaxons: boolean;
  image: HTMLImageElement | null;
  width_m: number;
  height_m: number;
  scaleToFit: number;
  imageX: number;
  imageY: number;
  applyOptimalStoryboard: boolean;
  frameWidthPx: number;
  frameHeightPx: number;
}

export const TrajectoryLayer = React.memo(({
  trajectoryData,
  showTaxons,
  image,
  width_m,
  height_m,
  scaleToFit,
  imageX,
  imageY,
  applyOptimalStoryboard,
  frameWidthPx,
  frameHeightPx,
}: TrajectoryLayerProps) => {
  if (!showTaxons || !image || !trajectoryData?.B) return null;

  const meterPerPixelX = width_m / image.width;
  const meterPerPixelY = height_m / image.height;

  return (
    <Layer>
      {trajectoryData.B.map((taxon: any, idx: number) => {
        const color = taxon.color;
        const baseX = taxon.base[0] / meterPerPixelX;
        const baseY = image.height - taxon.base[1] / meterPerPixelY;

        const taxonPoints: TrajectoryPoint[] = taxon.points.map(
          (p: [number, number], i: number) => ({
            x: p[0] / meterPerPixelX,
            y: image.height - p[1] / meterPerPixelY,
            color,
            number: i + 1,
          }),
        );

        return (
          <Fragment key={`taxon-${idx}`}>
            {/* Базовая точка */}
            <Line
              points={[
                baseX * scaleToFit + imageX - 8,
                baseY * scaleToFit + imageY - 8,
                baseX * scaleToFit + imageX + 8,
                baseY * scaleToFit + imageY,
                baseX * scaleToFit + imageX - 8,
                baseY * scaleToFit + imageY + 8,
              ]}
              fill={color}
              closed
            />

            {/* Стрелка от базы к первой точке */}
            {taxonPoints.length > 0 && (
              <Arrow
                points={getArrowPoints(
                  { x: baseX * scaleToFit + imageX, y: baseY * scaleToFit + imageY },
                  { x: taxonPoints[0].x * scaleToFit + imageX, y: taxonPoints[0].y * scaleToFit + imageY },
                  BASE_RADIUS,
                  TAXON_POINT_RADIUS,
                )}
                pointerLength={10}
                pointerWidth={7}
                fill={color}
                stroke={color}
                strokeWidth={2}
              />
            )}

            {/* Стрелки между точками */}
            {taxonPoints.map((point, i) => {
              if (i === 0) return null;
              const prev = taxonPoints[i - 1];
              return (
                <Arrow
                  key={`taxon-arrow-${idx}-${i}`}
                  points={getArrowPoints(
                    { x: prev.x * scaleToFit + imageX, y: prev.y * scaleToFit + imageY },
                    { x: point.x * scaleToFit + imageX, y: point.y * scaleToFit + imageY },
                    TAXON_POINT_RADIUS,
                    TAXON_POINT_RADIUS,
                  )}
                  pointerLength={10}
                  pointerWidth={7}
                  fill={color}
                  stroke={color}
                  strokeWidth={2}
                />
              );
            })}

            {/* Стрелка от последней точки к базе */}
            {taxonPoints.length > 0 && (
              <Arrow
                points={getArrowPoints(
                  {
                    x: taxonPoints[taxonPoints.length - 1].x * scaleToFit + imageX,
                    y: taxonPoints[taxonPoints.length - 1].y * scaleToFit + imageY
                  },
                  { x: baseX * scaleToFit + imageX, y: baseY * scaleToFit + imageY },
                  TAXON_POINT_RADIUS,
                  BASE_RADIUS,
                )}
                pointerLength={10}
                pointerWidth={7}
                fill={color}
                stroke={color}
                strokeWidth={2}
              />
            )}

            {/* Точки таксона с кадрами */}
            {taxonPoints.map((p, i) => (
              <Fragment key={`taxon-point-${idx}-${i}`}>
                {applyOptimalStoryboard && (
                  <Rect
                    x={p.x * scaleToFit + imageX - (frameWidthPx * scaleToFit) / 2}
                    y={p.y * scaleToFit + imageY - (frameHeightPx * scaleToFit) / 2}
                    width={frameWidthPx * scaleToFit}
                    height={frameHeightPx * scaleToFit}
                    stroke="#000000"
                    strokeWidth={2}
                    fill="#3a5cf34d"
                  />
                )}
                <Circle
                  x={p.x * scaleToFit + imageX}
                  y={p.y * scaleToFit + imageY}
                  radius={TAXON_POINT_RADIUS}
                  fill={p.color}
                  stroke="#1a1a1a"
                  strokeWidth={1}
                />
                <Text
                  x={p.x * scaleToFit + imageX - TAXON_POINT_RADIUS}
                  y={p.y * scaleToFit + imageY - TAXON_POINT_RADIUS}
                  width={TAXON_POINT_RADIUS * 2}
                  height={TAXON_POINT_RADIUS * 2}
                  text={`${i + 1}`}
                  fontSize={TAXON_POINT_RADIUS}
                  fontStyle="bold"
                  fill="black"
                  align="center"
                  verticalAlign="middle"
                />
              </Fragment>
            ))}
          </Fragment>
        );
      })}
    </Layer>
  );
});


// UI СЛОЙ (линии, вспомогательные элементы) 
interface UILayerProps {
  showUavLine: boolean;
  flightLineY: number | null;
  image: HTMLImageElement | null;
  imageX: number;
  imageY: number;
  scaleToFit: number;
}

export const UILayer = React.memo(({
  showUavLine,
  flightLineY,
  image,
  imageX,
  imageY,
  scaleToFit,
}: UILayerProps) => {
  if (!showUavLine || flightLineY === null || !image) return null;

  return (
    <Layer>
      <Line
        points={[
          imageX,
          flightLineY * scaleToFit + imageY,
          imageX + image.width * scaleToFit,
          flightLineY * scaleToFit + imageY,
        ]}
        stroke="orange"
        strokeWidth={2}
      />
      <Rect
        x={imageX}
        y={flightLineY * scaleToFit + imageY}
        width={image.width * scaleToFit}
        height={(image.height - flightLineY) * scaleToFit}
        fill="rgba(128, 128, 128, 0.3)"
        listening={false}
      />
      {flightLineY < image.height - 0.01 && (
        <Text
          x={imageX}
          y={flightLineY * scaleToFit + imageY + ((image.height - flightLineY) * scaleToFit) / 2 - 10}
          width={image.width * scaleToFit}
          text="Неинформативная зона"
          align="center"
          fontSize={16}
          fill="rgba(255,255,255,0.8)"
          listening={false}
        />
      )}
    </Layer>
  );
});