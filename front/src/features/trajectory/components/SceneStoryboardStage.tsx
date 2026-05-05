import React, { FC } from "react";
import { Box } from "@mui/material";
import { Stage } from "react-konva";
import {
  StaticLayer,
  SelectionLayer,
  UserPointsLayer,
  ObstaclesLayer,
  RecommendedLayer,
  TrajectoryLayer,
  UILayer
} from "./SceneStoryboardLayers";
import type { Point, Polygon } from "../../../types/scene.types";

interface SceneStoryboardStageProps {
  stageRef: React.RefObject<any>;
  STAGE_WIDTH: number;
  STAGE_HEIGHT: number;
  scale: number;
  position: { x: number; y: number };
  
  // Image
  image: HTMLImageElement | null | undefined;
  imageX: number;
  imageY: number;
  scaleToFit: number;
  gridLines: JSX.Element[] | null;
  
  // Data
  points: Point[];
  pointsRecommended: Point[];
  obstacles: Polygon[];
  trajectoryData: any;
  trajectoryData2?: any;
  trajectoryData3?: any;

  // Visibility
  showPoints: boolean;
  showObstacles: boolean;
  showTaxons: boolean;
  
  // Frame dimensions
  frameWidthPx: number;
  frameHeightPx: number;
  
  // Applied states
  applyPointBasedStoryboard: boolean | undefined;
  applyRecommendedStoryboard: boolean | undefined;
  applyOptimalStoryboard: boolean | undefined;
  applyOptimal2Storyboard?: boolean;
  applyOptimal3Storyboard?: boolean;

  showTaxonsMethod1?: boolean;
  showTaxonsMethod2?: boolean;
  showTaxonsMethod3?: boolean;

  showUavLine?: boolean;
  flightLineY?: number | null;

  // Drone params
  droneParams: any;
  
  // Selection
  isSelecting: boolean;
  selection: any;
  
  pxPerMeterX?: number;
  pxPerMeterY?: number;

  // Handlers
  handleDragMove: (e: any) => void;
  handleWheel: (e: any) => void;
  handleMouseDown: (e: any) => void;
  handleMouseMove: (e: any) => void;
  handleMouseUp: (e: any) => void;
  handleClick: (e: any) => void;
}

export const SceneStoryboardStage: FC<SceneStoryboardStageProps> = ({
  stageRef,
  STAGE_WIDTH,
  STAGE_HEIGHT,
  scale,
  position,
  image,
  imageX,
  imageY,
  scaleToFit,
  gridLines,
  points,
  pointsRecommended,
  obstacles,
  trajectoryData,
  showPoints,
  showObstacles,
  showTaxons,
  frameWidthPx,
  frameHeightPx,
  applyPointBasedStoryboard,
  applyRecommendedStoryboard,
  applyOptimalStoryboard,
  droneParams,
  isSelecting,
  selection,
  pxPerMeterX,
  pxPerMeterY,
  showUavLine,
  flightLineY,
  handleDragMove,
  handleWheel,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleClick,
}) => {
  const width_m = droneParams.frameWidthBase;
  const height_m = droneParams.frameHeightBase;

  return (
    <Box boxShadow={3} bgcolor="#fff">
      <Stage
        ref={stageRef}
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={!isSelecting}
        onDragMove={handleDragMove}
        onWheel={handleWheel}
        style={{ cursor: isSelecting ? "pointer" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Статический слой с изображением и сеткой */}
        <StaticLayer
          image={image}
          imageX={imageX}
          imageY={imageY}
          scaleToFit={scaleToFit}
          gridLines={gridLines}
          handleClick={handleClick}
          STAGE_WIDTH={STAGE_WIDTH}
          STAGE_HEIGHT={STAGE_HEIGHT}
        />

        {/* Слой выделения */}
        <SelectionLayer
          selection={selection}
          scaleToFit={scaleToFit}
          imageX={imageX}
          imageY={imageY}
          isVisible={isSelecting}
        />

        {/* Слой препятствий */}
        <ObstaclesLayer
          obstacles={obstacles}
          showObstacles={showObstacles}
          scaleToFit={scaleToFit}
          imageX={imageX}
          imageY={imageY}
          image={image}
          pxPerMeterX={pxPerMeterX}
          pxPerMeterY={pxPerMeterY}
        />

        {/* Слой пользовательских точек */}
        <UserPointsLayer
          points={points}
          showPoints={showPoints}
          scaleToFit={scaleToFit}
          imageX={imageX}
          imageY={imageY}
          frameWidthPx={frameWidthPx}
          frameHeightPx={frameHeightPx}
          applyPointBasedStoryboard={applyPointBasedStoryboard}
          image={image}
        />

        {/* Слой рекомендуемой раскадровки */}
        <RecommendedLayer
          pointsRecommended={pointsRecommended}
          applyRecommendedStoryboard={applyRecommendedStoryboard}
          scaleToFit={scaleToFit}
          imageX={imageX}
          imageY={imageY}
          frameWidthPx={frameWidthPx}
          frameHeightPx={frameHeightPx}
          image={image}
        />

        {/* Слой оптимальной траектории */}
        <TrajectoryLayer
          trajectoryData={trajectoryData}
          showTaxons={showTaxons}
          image={image}
          width_m={width_m}
          height_m={height_m}
          scaleToFit={scaleToFit}
          imageX={imageX}
          imageY={imageY}
          applyOptimalStoryboard={applyOptimalStoryboard}
          frameWidthPx={frameWidthPx}
          frameHeightPx={frameHeightPx}
        />

        <UILayer
          showUavLine={showUavLine ?? false}
          flightLineY={flightLineY ?? null}
          image={image}
          imageX={imageX}
          imageY={imageY}
          scaleToFit={scaleToFit}
        />
      </Stage>
    </Box>
  );
};