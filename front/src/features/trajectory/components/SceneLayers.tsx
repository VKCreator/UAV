// SceneLayers.tsx
import React, { Fragment } from "react";
import { Layer, Image as KonvaImage, Circle, Text, Arrow, Line, Rect, Group } from "react-konva";
import NavigationTriangles from "./NavigationTriangles";
import { Point, Polygon, TrajectoryPoint } from "../../../types/scene.types";
import { convexHull, outwardUnitNormal } from "../utils/Geometry";

const TAXON_POINT_RADIUS = 10;
const BASE_RADIUS = 4;


// Вспомогательная функция для стрелок
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

// СТАТИЧЕСКИЙ СЛОЙ (не меняется)
// SceneLayers.tsx
export const StaticLayer = React.memo(({
  image,
  imageX,
  imageY,
  scaleToFit,
  gridLines,
  handleClick,
  STAGE_WIDTH,
  STAGE_HEIGHT
}: any) => {
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
            onContextMenu={(e) => e.evt.preventDefault()}
          />
          {gridLines}
        </>
      ) : (
        <>
          {/* Полупрозрачный фон */}
          <Rect 
            x={0} 
            y={0} 
            width={STAGE_WIDTH} 
            height={STAGE_HEIGHT} 
            fill="rgba(255,255,255,0.7)" 
          />
          
          {/* Центрированный текст */}
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

// СЛОЙ ПОЛЬЗОВАТЕЛЬСКИХ ТОЧЕК
export const UserPointsLayer = React.memo(({
  points,
  showUserTrajectory,
  scaleToFit,
  imageX,
  imageY,
  toolMode,
  setPoints,
  getCursor,
  image
}: any) => {
  if (!showUserTrajectory || !image) return null;

  return (
    <Layer>
      {points.length > 1 && points.map((point: Point, i: number) => {
        if (i === 0) return null;
        const prev = points[i - 1];
        const from = { x: prev.x * scaleToFit + imageX, y: prev.y * scaleToFit + imageY };
        const to = { x: point.x * scaleToFit + imageX, y: point.y * scaleToFit + imageY };

        return (
          <Arrow
            key={`arrow-${i}`}
            points={getArrowPoints(from, to, TAXON_POINT_RADIUS, TAXON_POINT_RADIUS)}
            pointerLength={10}
            pointerWidth={7}
            fill="red"
            stroke="red"
            strokeWidth={2}
          />
        );
      })}

      {points.map((point: Point, i: number) => (
        <Fragment key={`point-${i}`}>
          <Circle
            x={point.x * scaleToFit + imageX}
            y={point.y * scaleToFit + imageY}
            radius={10}
            fill="blue"
            onContextMenu={(e) => {
              e.evt.preventDefault();
              if (toolMode === "points") setPoints(points.filter((_: any, idx: number) => idx !== i));
            }}
            onMouseEnter={(e) => e.target.getStage().container().style.cursor = "pointer"}
            onMouseLeave={(e) => e.target.getStage().container().style.cursor = getCursor()}
          />
          <Text
            x={point.x * scaleToFit + imageX - 6}
            y={point.y * scaleToFit + imageY - 6}
            text={(i + 1).toString()}
            fontSize={12}
            fill="white"
            onContextMenu={(e) => {
              e.evt.preventDefault();
              if (toolMode === "points") setPoints(points.filter((_: any, idx: number) => idx !== i));
            }}
          />
        </Fragment>
      ))}
    </Layer>
  );
}, (prevProps, nextProps) => {
  // Кастомное сравнение для предотвращения лишних ререндеров
  return (
    prevProps.points === nextProps.points &&
    prevProps.showUserTrajectory === nextProps.showUserTrajectory &&
    prevProps.toolMode === nextProps.toolMode &&
    prevProps.scaleToFit === nextProps.scaleToFit &&
    prevProps.imageX === nextProps.imageX &&
    prevProps.imageY === nextProps.imageY
  );
});

// СЛОЙ ПРЕПЯТСТВИЙ
export const ObstaclesLayer = React.memo(({
  obstacles,
  showObstacles,
  scaleToFit,
  image,
  imageX,
  imageY,
  hoveredObstacleId,
  setHoveredObstacleId,
  getCursor,
  pxPerMeterX = 1,  // пикселей в метре по X
  pxPerMeterY = 1   // пикселей в метре по Y
}: any) => {
  if (!showObstacles || !image) return null;

  // Строит безопасную зону: делает полигон выпуклым, затем сдвигает
  // каждое ребро наружу на metersToExpand метров.
  const buildSafeZone = (poly: Polygon, metersToExpand: number): Point[] => {
    if (!poly.points || poly.points.length < 3) return poly.points ?? [];

    // Работаем в метрах, чтобы сдвиг был изотропным.
    const inMeters: Point[] = poly.points.map((p) => ({
      x: p.x / pxPerMeterX,
      y: p.y / pxPerMeterY,
    }));

    const hull = convexHull(inMeters);
    if (hull.length < 3 || !metersToExpand) {
      return hull.map((p) => ({
        x: p.x * pxPerMeterX,
        y: p.y * pxPerMeterY,
      }));
    }

    const centroid: Point = {
      x: hull.reduce((s, p) => s + p.x, 0) / hull.length,
      y: hull.reduce((s, p) => s + p.y, 0) / hull.length,
    };

    const n = hull.length;
    const expanded: Point[] = hull.map((v, i) => {
      const prev = hull[(i - 1 + n) % n];
      const next = hull[(i + 1) % n];
      const nIn = outwardUnitNormal(prev, v, centroid);
      const nOut = outwardUnitNormal(v, next, centroid);
      const denom = 1 + nIn.x * nOut.x + nIn.y * nOut.y;
      if (Math.abs(denom) < 1e-9) {
        return {
          x: v.x + metersToExpand * nIn.x,
          y: v.y + metersToExpand * nIn.y,
        };
      }
      const factor = metersToExpand / denom;
      return {
        x: v.x + factor * (nIn.x + nOut.x),
        y: v.y + factor * (nIn.y + nOut.y),
      };
    });

    return expanded.map((p) => ({
      x: p.x * pxPerMeterX,
      y: p.y * pxPerMeterY,
    }));
  };

  return (
    <Layer>
      {obstacles.map((poly: Polygon, index: number) => {
        const isHovered = hoveredObstacleId === poly.id;
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
            {/* Безопасная зона (выпуклая, сдвинутая наружу на safeZone м) */}
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
              onMouseEnter={(e) => {
                e.target.getStage().container().style.cursor = "pointer";
              }}
              onMouseLeave={(e) => {
                e.target.getStage().container().style.cursor = getCursor();
              }}
            // listening={false}
            />
            <Line
              points={poly.points.flatMap((p) => [
                p.x * scaleToFit + imageX,
                p.y * scaleToFit + imageY,
              ])}
              closed
              fill={isHovered ? `${poly.color}55` : `${poly.color}20`}
              stroke={poly.color}
              strokeWidth={isHovered ? 3 : 2}
              onMouseEnter={(e) => {
                e.target.getStage().container().style.cursor = "pointer";
                setHoveredObstacleId(poly.id);
              }}
              onMouseLeave={(e) => {
                e.target.getStage().container().style.cursor = getCursor();
                setHoveredObstacleId(null);
              }}
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
              radius={12}
              fill="rgba(0,0,0,0.55)"
              listening={false}
            />
            <Text
              x={labelX}
              y={labelY}
              text={labelText}
              fontSize={14}
              fontStyle="bold"
              fill="#fff"
              align="center"
              verticalAlign="middle"
              offsetX={labelText.length * 4}
              offsetY={7}
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
    prevProps.hoveredObstacleId === nextProps.hoveredObstacleId &&
    prevProps.scaleToFit === nextProps.scaleToFit
  );
});

// СЛОЙ ОПТИМИЗИРОВАННОЙ ТРАЕКТОРИИ
export const TrajectoryLayer = React.memo(({
  trajectoryData,
  showTaxonTrajectory,
  image,
  width_m,
  height_m,
  scaleToFit,
  imageX,
  imageY,
  colors
}: any) => {
  if (!showTaxonTrajectory || !image || !trajectoryData?.B) return null;

  const meterPerPixelX = width_m / image.width;
  const meterPerPixelY = height_m / image.height;

  return (
    <Layer>
      {trajectoryData.B.map((taxon: any, idx: number) => {
        // const color = colors[idx % colors.length];
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

            {taxonPoints.length > 0 && (
              <Arrow
                points={getArrowPoints(
                  { x: taxonPoints[taxonPoints.length - 1].x * scaleToFit + imageX, y: taxonPoints[taxonPoints.length - 1].y * scaleToFit + imageY },
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

            <NavigationTriangles
              segments={taxon.segments || []}
              meterPerPixelX={meterPerPixelX}
              meterPerPixelY={meterPerPixelY}
              imageHeight={image.height}
              scaleToFit={scaleToFit}
              imageX={imageX}
              imageY={imageY}
              taxonIdx={idx}
            />

            {taxonPoints.map((p, i) => (
              <Fragment key={`taxon-point-${idx}-${i}`}>
                <Circle
                  x={p.x * scaleToFit + imageX}
                  y={p.y * scaleToFit + imageY}
                  radius={TAXON_POINT_RADIUS}
                  fill={p.color}
                />
                <Text
                  x={p.x * scaleToFit + imageX - 5}
                  y={p.y * scaleToFit + imageY - 7}
                  text={`${i + 1}`}
                  fontSize={12}
                  fill="black"
                />
              </Fragment>
            ))}
          </Fragment>
        );
      })}

      {trajectoryData?.C?.map((point: [number, number], index: number) => {
        const meterPerPixelX = width_m / image.width;
        const meterPerPixelY = height_m / image.height;
        const x = point[0] / meterPerPixelX;
        const y = image.height - point[1] / meterPerPixelY;
        const cx = x * scaleToFit + imageX;
        const cy = y * scaleToFit + imageY;

        return (
          <Fragment key={`unvisited-${index}`}>
            <Circle x={cx} y={cy} radius={10} fill="rgba(255, 107, 53, 0.15)" stroke="#FF6B35" strokeWidth={1.5} />
            <Line points={[cx - 4, cy - 4, cx + 4, cy + 4]} stroke="#FF6B35" strokeWidth={2} />
            <Line points={[cx + 4, cy - 4, cx - 4, cy + 4]} stroke="#FF6B35" strokeWidth={2} />
          </Fragment>
        );
      })}
    </Layer>
  );
});

// Слой вспомогательных информационных элементов
export const UILayer = React.memo(({
  toolMode,
  lineY,
  image,
  imageX,
  imageY,
  scaleToFit,
  weatherConditions,
  showUavLine,
  flightLineY,
  currentPolygon,
  STAGE_WIDTH,
  STAGE_HEIGHT
}: any) => {
  if (!image) return null;

  return (
    <Layer>
      {/* Линия при режиме line */}
      {toolMode === "line" && lineY !== null && image && (
        <Line
          points={[imageX, lineY, imageX + image.width * scaleToFit, lineY]}
          stroke="red"
          strokeWidth={2}
          dash={[8, 4]}
        />
      )}

      {/* Стрелка ветра */}
      {weatherConditions && weatherConditions.isUse && weatherConditions.windSpeed > 0 && (
        <Group>
          <Rect x={20} y={20} width={90} height={90} fill="rgba(0,0,0,0.45)" cornerRadius={8} />
          {(() => {
            const cx = 65, cy = 65, len = 15;
            const rad = Math.PI * (weatherConditions.windDirection + 180) / 180;
            return (
              <Arrow
                points={[
                  cx - len * Math.sin(rad), cy + len * Math.cos(rad),
                  cx + len * Math.sin(rad), cy - len * Math.cos(rad)
                ]}
                pointerLength={8} pointerWidth={6} fill="#ff6b00" stroke="#ff6b00" strokeWidth={2}
              />
            );
          })()}
          <Text x={20} y={24} width={90} text="ветер" fontSize={10} fill="white" align="center" />
          <Text x={20} y={88} width={90} text={`${weatherConditions.windSpeed.toFixed(1)} м/с`} fontSize={10} fill="#ff6b00" align="center" />
        </Group>
      )}

      {/* UAV линия */}
      {showUavLine && flightLineY !== null && image && (
        <Fragment>
          <Line
            points={[imageX, flightLineY * scaleToFit + imageY, imageX + image.width * scaleToFit, flightLineY * scaleToFit + imageY]}
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
        </Fragment>
      )}

      {/* Текущий полигон */}
      {toolMode === "polygons" && currentPolygon.length > 0 && (
        <>
          <Line
            points={currentPolygon.flatMap((p: Point) => [p.x * scaleToFit + imageX, p.y * scaleToFit + imageY])}
            stroke="orange"
            strokeWidth={2}
            dash={[6, 4]}
          />
          {currentPolygon.map((p: Point, i: number) => (
            <Circle key={i} x={p.x * scaleToFit + imageX} y={p.y * scaleToFit + imageY} radius={6} fill="orange" />
          ))}
        </>
      )}
    </Layer>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.toolMode === nextProps.toolMode &&
    prevProps.lineY === nextProps.lineY &&
    prevProps.image === nextProps.image &&
    prevProps.scaleToFit === nextProps.scaleToFit &&
    prevProps.showUavLine === nextProps.showUavLine &&
    prevProps.flightLineY === nextProps.flightLineY &&
    prevProps.currentPolygon === nextProps.currentPolygon &&
    JSON.stringify(prevProps.weatherConditions) === JSON.stringify(nextProps.weatherConditions)
  );
});

// Новый компонент LoadingLayer - всегда последний в Stage
export const LoadingLayer = React.memo(({ 
  loading, 
  STAGE_WIDTH, 
  STAGE_HEIGHT 
}: any) => {
  if (!loading) return null;
  
  return (
    <Layer>
      <Rect 
        x={0} 
        y={0} 
        width={STAGE_WIDTH} 
        height={STAGE_HEIGHT} 
        fill="rgba(255,255,255,0.7)" 
        listening={true} // Блокируем клики под лоадером
        onClick={(e) => e.cancelBubble = true} // Предотвращаем всплытие
        onTap={(e) => e.cancelBubble = true}
      />
      <Text 
        x={STAGE_WIDTH / 2} 
        y={STAGE_HEIGHT / 2} 
        text="Загрузка..." 
        fontSize={18}
        fontStyle="bold"
        fill="#004E9E"
        align="center"
        verticalAlign="middle"
        fontFamily="Inter"
        offsetX={50}
        offsetY={10}
        listening={false}
      />
    </Layer>
  );
});