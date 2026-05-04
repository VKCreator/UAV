import { useMemo, FC, JSX } from "react";
import { Box, Tooltip } from "@mui/material";
import { SceneStage } from "./SceneStage";
import {
    Rect,
} from "react-konva";

// Интерфейс пропсов для нашего оберточного компонента
interface ScenePreviewProps {
    // Общие данные
    imageData: any;
    droneParams: any;
    points: any[];
    obstacles: any[];
    flightLineY: any;
    weatherConditions: any;
    onShowView: () => void;
    stageRef: any; // ref для Stage
    // Переменные для отрисовки (рассчитываются в родителе)
    image: HTMLImageElement | null;

    // Специфичные для каждого кейса
    trajectoryData: any;
    showUserTrajectory: boolean;
    showTaxonTrajectory: boolean;
    showObstacles?: boolean;
    showLine?: boolean;
    isLoading?: boolean;
    isShowView?: boolean;
    showGrid?: boolean;
    showNavigationTriangles?: boolean;

    PREVIEW_WIDTH?: number;
    PREVIEW_HEIGHT?: number;
}

const ScenePreview: FC<ScenePreviewProps> = ({
    imageData,
    droneParams,
    points,
    obstacles,
    flightLineY,
    weatherConditions,
    onShowView,
    stageRef,
    image,
    trajectoryData,
    showUserTrajectory,
    showTaxonTrajectory,
    isLoading = false,
    isShowView = true,
    showNavigationTriangles = false,
    showObstacles = true,
    showLine = true,
    showGrid = true,
    PREVIEW_WIDTH = 700,
    PREVIEW_HEIGHT = 500
}) => {
    // const PREVIEW_WIDTH = 700;
    // const PREVIEW_HEIGHT = 500;

    const width_m = droneParams.frameWidthBase;
    const height_m = droneParams.frameHeightBase;
    const pxPerMeterX = image ? image.width / width_m : 1;
    const pxPerMeterY = image ? image.height / height_m : 1;

    const scaleToFit = image
        ? Math.min(
            1,
            (PREVIEW_WIDTH / image.width) * 0.9,
            (PREVIEW_HEIGHT / image.height) * 0.9,
        )
        : 1;

    const imageX = image ? (PREVIEW_WIDTH - image.width * scaleToFit) / 2 : 0;
    const imageY = image ? (PREVIEW_HEIGHT - image.height * scaleToFit) / 2 : 0;
    const GRID_COLS = droneParams.frameWidthBase / droneParams.frameWidthPlanned;
    const GRID_ROWS =
        droneParams.frameHeightBase / droneParams.frameHeightPlanned;

    const gridLines = useMemo(() => {
        if (!image || !showGrid) return null;

        const lines: JSX.Element[] = [];
        const imgWidth = image.width * scaleToFit;
        const imgHeight = image.height * scaleToFit;

        const cellWidth = imgWidth / GRID_COLS;
        const cellHeight = imgHeight / GRID_ROWS;
        const lineStyle = {
            width: 2,
            height: 2,
            fill: "rgba(255, 255, 255, 0.8)",
            stroke: "rgb(0, 0, 0, 1)",
            strokeWidth: 0.1
        };

        // Вертикальные линии
        for (let i = 1; i < GRID_COLS; i++) {
            const x = imageX + cellWidth * i;
            lines.push(
                <Rect
                    key={`v-${i}`}
                    x={x}
                    y={imageY}
                    width={lineStyle.width}
                    height={imgHeight}
                    fill={lineStyle.fill}
                    stroke={lineStyle.stroke}
                    strokeWidth={lineStyle.strokeWidth}
                />
            );
        }

        // Горизонтальные линии
        for (let i = 1; i < GRID_ROWS; i++) {
            const y = imageY + imgHeight - cellHeight * i;
            lines.push(
                <Rect
                    key={`h-${i}`}
                    x={imageX}
                    y={y}
                    width={imgWidth}
                    height={lineStyle.height}
                    fill={lineStyle.fill}
                    stroke={lineStyle.stroke}
                    strokeWidth={lineStyle.strokeWidth}
                />
            );
        }

        return lines;
    }, [image, GRID_COLS, GRID_ROWS, imageX, imageY, scaleToFit, showGrid]);

    return (
        // <Tooltip
        //     title="Нажмите для просмотра"
        //     arrow
        //     placement="top"
        //     followCursor
        //     // open={isShowView}
        // >
        <Box
            sx={{ cursor: isShowView ? 'pointer' : 'default', width: "100%", height: "100%" }}
            onClick={onShowView}
        >
            <SceneStage
                ref={stageRef}

                // Layout
                STAGE_WIDTH={PREVIEW_WIDTH}
                STAGE_HEIGHT={PREVIEW_HEIGHT}
                scale={1}
                position={{ x: 0, y: 0 }}

                // Image Props
                image={image}
                imageX={imageX}
                imageY={imageY}
                scaleToFit={scaleToFit}
                gridLines={gridLines}

                draggable={false}
                handleWheel={() => { }}
                handleDragMove={() => { }}

                // Data
                points={points}
                showUserTrajectory={showUserTrajectory}
                setPoints={() => { }} // Заглушка

                obstacles={obstacles}
                showObstacles={showObstacles}
                hoveredObstacleId={null}
                setHoveredObstacleId={() => { }}
                pxPerMeterX={pxPerMeterX}
                pxPerMeterY={pxPerMeterY}

                trajectoryData={trajectoryData}
                showTaxonTrajectory={showTaxonTrajectory}
                width_m={width_m}
                height_m={height_m}
                colors={[]}

                weatherConditions={weatherConditions}
                showUavLine={showLine}
                flightLineY={flightLineY}
                currentPolygon={[]}

                // State
                toolMode="pan"
                lineY={null}
                loading={isLoading} // Передаем статус загрузки
                showNavigationTriangles={showNavigationTriangles}
                getCursor={() => isShowView ? 'pointer' : 'default'}
                handleMouseMove={() => { }}
                handleStageClick={(e) => e.cancelBubble = true}
                handleClick={() => { }}
            />
        </Box>
        // </Tooltip>
    );
};

export default ScenePreview;