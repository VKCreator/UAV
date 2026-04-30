import React, { FC, JSX } from "react";
import { Box } from "@mui/material";
import {
    Stage,
    Layer,
    Rect,
    Text
} from "react-konva";

import type { Point, Polygon, ImageData } from "../../../types/scene.types";
import { StaticLayer, UserPointsLayer, ObstaclesLayer, TrajectoryLayer, UILayer, LoadingLayer } from "./SceneLayers";

interface SceneStageProps {
    stageRef: React.RefObject<any>;
    scale: number;
    position: { x: number; y: number };
    toolMode: string;
    lineY: number | null;
    loading: boolean;
    STAGE_WIDTH: number;
    STAGE_HEIGHT: number;
    image: HTMLImageElement | null;
    imageX: number;
    imageY: number;
    scaleToFit: number;
    gridLines: JSX.Element[] | null;

    // Data props
    points: Point[];
    showUserTrajectory: boolean;
    setPoints: React.Dispatch<React.SetStateAction<Point[]>>;
    obstacles: Polygon[];
    showObstacles: boolean;
    hoveredObstacleId: string | null;
    setHoveredObstacleId: React.Dispatch<React.SetStateAction<string | null>>;
    pxPerMeterX: number;
    pxPerMeterY: number;
    trajectoryData: any;
    showTaxonTrajectory: boolean;
    width_m: number;
    height_m: number;
    colors: readonly string[];
    weatherConditions: any;
    showUavLine: boolean;
    flightLineY: number | null;
    currentPolygon: Point[];
    draggable?: boolean;

    // Handlers
    handleDragMove: (e: any) => void;
    handleWheel: (e: any) => void;
    getCursor: () => string;
    handleMouseMove: (e: any) => void;
    handleStageClick: () => void;
    handleClick: (e: any) => void;
}

export const SceneStage: FC<SceneStageProps> = ({
    stageRef,
    scale,
    position,
    toolMode,
    lineY,
    loading,
    STAGE_WIDTH,
    STAGE_HEIGHT,
    image,
    imageX,
    imageY,
    scaleToFit,
    gridLines,
    points,
    showUserTrajectory,
    setPoints,
    obstacles,
    showObstacles,
    hoveredObstacleId,
    setHoveredObstacleId,
    pxPerMeterX,
    pxPerMeterY,
    trajectoryData,
    showTaxonTrajectory,
    width_m,
    height_m,
    colors,
    weatherConditions,
    showUavLine,
    flightLineY,
    currentPolygon,
    draggable,
    handleDragMove,
    handleWheel,
    getCursor,
    handleMouseMove,
    handleStageClick,
    handleClick,
}) => {
    return (
        // Только контейнер с тенью и сам Stage
        <Box
            boxShadow={3}
            bgcolor="#ffffff"
            minWidth={STAGE_WIDTH}
            minHeight={STAGE_HEIGHT}
        >
            <Stage
                ref={stageRef}
                width={STAGE_WIDTH}
                height={STAGE_HEIGHT}
                scaleX={scale}
                scaleY={scale}
                x={position.x}
                y={position.y}
                draggable={draggable !== false}
                onDragMove={handleDragMove}
                onWheel={handleWheel}
                style={{ cursor: getCursor() }}
                onMouseMove={handleMouseMove}
                onClick={handleStageClick}
            >
                <LoadingLayer
                    loading={loading}
                    STAGE_WIDTH={STAGE_WIDTH}
                    STAGE_HEIGHT={STAGE_HEIGHT}
                />

                <StaticLayer
                    image={image}
                    imageX={imageX}
                    imageY={imageY}
                    scaleToFit={scaleToFit}
                    gridLines={gridLines}
                    handleClick={handleClick}
                    STAGE_WIDTH={STAGE_WIDTH}
                    STAGE_HEIGHT={STAGE_HEIGHT}
                    loading={loading}
                />

                <UserPointsLayer
                    points={points}
                    showUserTrajectory={showUserTrajectory}
                    scaleToFit={scaleToFit}
                    image={image}
                    imageX={imageX}
                    imageY={imageY}
                    toolMode={toolMode}
                    setPoints={setPoints}
                    getCursor={getCursor}
                />

                <ObstaclesLayer
                    obstacles={obstacles}
                    showObstacles={showObstacles}
                    scaleToFit={scaleToFit}
                    image={image}
                    imageX={imageX}
                    imageY={imageY}
                    hoveredObstacleId={hoveredObstacleId}
                    setHoveredObstacleId={setHoveredObstacleId}
                    getCursor={getCursor}
                    pxPerMeterX={pxPerMeterX}
                    pxPerMeterY={pxPerMeterY}
                />

                <TrajectoryLayer
                    trajectoryData={trajectoryData}
                    showTaxonTrajectory={showTaxonTrajectory}
                    image={image}
                    width_m={width_m}
                    height_m={height_m}
                    scaleToFit={scaleToFit}
                    imageX={imageX}
                    imageY={imageY}
                    colors={colors}
                />

                <UILayer
                    toolMode={toolMode}
                    lineY={lineY}
                    image={image}
                    imageX={imageX}
                    imageY={imageY}
                    scaleToFit={scaleToFit}
                    weatherConditions={weatherConditions}
                    showUavLine={showUavLine}
                    flightLineY={flightLineY}
                    currentPolygon={currentPolygon}
                    STAGE_WIDTH={STAGE_WIDTH}
                    STAGE_HEIGHT={STAGE_HEIGHT}
                />
            </Stage>
        </Box>
    );
};