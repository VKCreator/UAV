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
}) => {
  const [showEditor, setShowEditor] = React.useState(false);
  const [showView, setShowView] = React.useState(false);
  const [mode, setMode] = React.useState<string>("pan");

  const [imageUrl, setImageUrl] = React.useState<string>(imageData.imageUrl);
  const notifications = useNotifications();

  React.useEffect(() => {
    setImageUrl(imageData.imageUrl);
  }, [imageData.imageUrl]);

  const handleViewScheme = React.useCallback(() => {
    setShowView(true);
  }, []);

  const handleEditScheme = React.useCallback(() => {
    setShowEditor(true);
  }, []);

  const handleClearScheme = () => {
    setPoints([]);
    setObstacles([]);
    setTrajectoryData(null);
  };

  const sceneUserTrajectoryShower = useRef<{ handleDownload: () => void }>(
    null,
  );

  const handleDownload = () => {
    sceneUserTrajectoryShower.current?.handleDownload();
  };

  const handleUpdateDroneParams = (params: any) => {
    console.info(params);
    setDroneParams(params);

    if (trajectoryData != null) {
      notifications.show("Изменены параметры съёмки. Результаты оптимизации очищены.", {
        severity: "info",
        autoHideDuration: 5000,
      });
      setTrajectoryData(null);
    }
  };

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
                    onClick={handleEditScheme}
                    aria-label="Редактор схемы"
                  >
                    <ModeEditIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Просмотр схемы" enterDelay={500}>
                  <IconButton
                    color="primary"
                    onClick={handleViewScheme}
                    aria-label="Просмотр схемы"
                  >
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Очистить схему" enterDelay={500}>
                  <span>
                    <IconButton
                      color="error"
                      onClick={handleClearScheme}
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
                      onClick={handleDownload}
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
                showView={() => setShowView(true)}
                ref={sceneUserTrajectoryShower}
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
          </Paper>

          {/* <Paper
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid #e0e0e0",
              borderRadius: 1,
              mt: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
          </Paper> */}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" sx={{ mb: 1, textAlign: "left" }}>
            Порядок построения траектории
          </Typography>

          <Box sx={{ mt: 1 }}>
            <FlightPlanningAccordion
              imageData={imageData}
              points={points}
              obstacles={obstacles}
              onClearObstacles={() => {
                setObstacles([]);
              }}
              onClearUserTrajectory={() => {
                setPoints([]);
              }}
              onEditObstacles={() => {
                setShowEditor(true);
                setMode("polygons");
              }}
              onEditUserTrajectory={() => {
                setShowEditor(true);
                setMode("points");
              }}
              onUpdateDroneParams={handleUpdateDroneParams}
              setDroneParams={setDroneParams}
              droneParams={droneParams}
            />
          </Box>
        </Grid>
      </Grid>

      <Dialog
        open={showEditor}
        onClose={() => setShowEditor(false)}
        fullScreen
        disableEscapeKeyDown
      >
        <DialogContent sx={{ p: 0 }}>
          <SceneEditor
            onClose={() => setShowEditor(false)}
            mode={mode}
            imageData={imageData}
            droneParams={droneParams}
            sceneTitle="Редактор схемы полётов"
            points={points}
            setPoints={setPoints}
            obstacles={obstacles}
            setObstacles={setObstacles}
            trajectoryData={null}
            setTrajectoryData={setTrajectoryData}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showView} onClose={() => setShowView(false)} fullScreen>
        <DialogContent sx={{ p: 0 }}>
          <SceneEditor
            onClose={() => setShowView(false)}
            imageData={imageData}
            droneParams={droneParams}
            sceneTitle="Просмотр схемы полётов"
            points={points}
            setPoints={setPoints}
            obstacles={obstacles}
            setObstacles={setObstacles}
            trajectoryData={null}
            setTrajectoryData={setTrajectoryData}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default BuildTrajectoryStep;
