import React, { useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { Tooltip } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import FlightPlanningAccordion from "./FlightPlanningAccordion";
import SceneEditor from "../draw/SceneEditor";
import SceneShower from "../draw/SceneShower";

import ModeEditIcon from "@mui/icons-material/ModeEdit";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

import type { Point, Polygon, ImageData } from "../draw/scene.types";
import useNotifications from "../../hooks/useNotifications/useNotifications";
import { useDialogs } from "../../hooks/useDialogs/useDialogs";
import { Drone } from "../../api/client";

interface BuildTrajectoryStepProps {
  imageData: ImageData;

  points: Point[];
  setPoints: React.Dispatch<React.SetStateAction<Point[]>>;

  obstacles: Polygon[];
  setObstacles: React.Dispatch<React.SetStateAction<Polygon[]>>;

  trajectoryData: any;
  setTrajectoryData: (data: any) => void;

  droneParams: any;
  setDroneParams: (params: any) => void;

  drones: Drone[];

  flightLineY: number;
  setFlightLineY: (flightLineY: any) => void;
}

const BuildTrajectoryStep: React.FC<BuildTrajectoryStepProps> = ({
  imageData,
  points,
  setPoints,
  obstacles,
  setObstacles,
  trajectoryData,
  setTrajectoryData,
  droneParams,
  setDroneParams,
  drones,
  flightLineY,
  setFlightLineY,
}) => {
  const { confirm } = useDialogs();
  const notifications = useNotifications();

  const [isEditorOpen, setEditorOpen] = React.useState(false);
  const [isViewerOpen, setViewerOpen] = React.useState(false);
  const [editorMode, setEditorMode] = React.useState<string>("pan");

  const scenePreviewRef = useRef<{ handleDownload: () => void }>(null);

  const openEditor = (mode: string = "pan") => {
    setEditorMode(mode);
    setEditorOpen(true);
  };
  const closeEditor = () => setEditorOpen(false);

  const openViewer = () => setViewerOpen(true);
  const closeViewer = () => setViewerOpen(false);

  const clearScene = async () => {
    const confirmed = await confirm("Вы действительно хотите очистить схему?", {
      title: "Подтверждение",
      okText: "Да",
      cancelText: "Нет",
    });

    if (!confirmed) return;

    setPoints([]);
    setObstacles([]);
    setTrajectoryData(null);
  };

  const downloadScene = () => {
    scenePreviewRef.current?.handleDownload();
  };

  const isResolutionMatch =
    droneParams.uavCameraParams.resolutionWidth === imageData.width &&
    droneParams.uavCameraParams.resolutionHeight === imageData.height;

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid #e0e0e0",
              borderRadius: 1,
              display: "flex",
              flexDirection: "column",
              width: "100%",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
                mb: 1,
              }}
            >
              <Typography variant="h6">Схема полёта</Typography>

              <Box sx={{ display: "flex", gap: 1 }}>
                <Tooltip title="Редактировать схему" enterDelay={500}>
                  <IconButton
                    color="primary"
                    onClick={() => openEditor()}
                    aria-label="Редактор схемы"
                  >
                    <ModeEditIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Просмотр схемы" enterDelay={500}>
                  <IconButton
                    color="primary"
                    onClick={openViewer}
                    aria-label="Просмотр схемы"
                  >
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Очистить схему" enterDelay={500}>
                  <span>
                    <IconButton
                      color="error"
                      onClick={clearScene}
                      aria-label="Очистить схему"
                      disabled={points.length === 0 && obstacles.length === 0}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title="Скачать схему" enterDelay={500}>
                  <span>
                    <IconButton
                      onClick={downloadScene}
                      color="primary"
                      aria-label="Скачать схему"
                      disabled={points.length === 0}
                    >
                      <DownloadIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>

            <Divider />
            <Box
              sx={{
                width: "100%",
                maxHeight: "400px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                mt: 2,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <SceneShower
                imageData={imageData}
                droneParams={droneParams}
                points={points}
                obstacles={obstacles}
                trajectoryData={trajectoryData}
                showView={() => setViewerOpen(true)}
                ref={scenePreviewRef}
                showGrid={true}
                showUserTrajectory={true}
                showObstacles={true}
                showTaxonTrajectory={false}
              />
            </Box>
            <Box display="flex" alignItems="center" sx={{ mt: 2, ml: 1 }}>
              <Typography color="text.secondary">
                Разрешение базового слоя: {imageData?.width} x{" "}
                {imageData?.height} px
              </Typography>

              <Tooltip
                title="Базовый слой не должен быть обрезанным изображением или после преобразований. Разрешения фотокамеры должны совпадать с разрешениями базового слоя."
                arrow
                enterDelay={400}
              >
                <IconButton size="small" sx={{ m: 0, p: 0, ml: 1 }}>
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {!isResolutionMatch && (
              <Alert severity="warning" sx={{ alignItems: "center", mt: 2 }}>
                Обратите внимание, что разрешение камеры выбранного БПЛА не
                совпадают с разрешением базового слоя.
              </Alert>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" sx={{ mb: 1, textAlign: "left" }}>
            Порядок построения траектории
          </Typography>

          <Box sx={{ mt: 1 }}>
            <FlightPlanningAccordion
              imageData={imageData}
              points={points}
              drones={drones}
              obstacles={obstacles}
              onClearObstacles={() => {
                setObstacles([]);
              }}
              onClearUserTrajectory={() => {
                setPoints([]);
              }}
              onEditObstacles={() => {
                setEditorOpen(true);
                setEditorMode("polygons");
              }}
              onEditUserTrajectory={() => {
                setEditorOpen(true);
                setEditorMode("points");
              }}
              setDroneParams={setDroneParams}
              droneParams={droneParams}
            />
          </Box>
        </Grid>
      </Grid>

      <Dialog
        open={isEditorOpen}
        onClose={closeEditor}
        fullScreen
        disableEscapeKeyDown
      >
        <DialogContent sx={{ p: 0 }}>
          <SceneEditor
            onClose={closeEditor}
            mode={editorMode}
            imageData={imageData}
            droneParams={droneParams}
            sceneTitle="Редактор схемы полётов"
            points={points}
            setPoints={setPoints}
            obstacles={obstacles}
            setObstacles={setObstacles}
            trajectoryData={null}
            setTrajectoryData={setTrajectoryData}
            flightLineY={flightLineY}
            setFlightLineY={setFlightLineY}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isViewerOpen} onClose={closeViewer} fullScreen>
        <DialogContent sx={{ p: 0 }}>
          <SceneEditor
            onClose={closeViewer}
            imageData={imageData}
            droneParams={droneParams}
            sceneTitle="Просмотр схемы полётов"
            points={points}
            setPoints={setPoints}
            obstacles={obstacles}
            setObstacles={setObstacles}
            trajectoryData={null}
            setTrajectoryData={setTrajectoryData}
            flightLineY={flightLineY}
            setFlightLineY={setFlightLineY}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default BuildTrajectoryStep;
