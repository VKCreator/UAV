import * as React from "react";
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

import type {
  Point,
  Polygon,
  ImageData,
  TrajectoryPoint,
} from "../draw/scene.types";

const BuildTrajectoryStep: React.FC<{
  imageData: ImageData;
}> = ({ imageData }) => {
  const [points, setPoints] = React.useState<Point[]>([]);
  const [obstacles, setObstacles] = React.useState<Polygon[]>([]);
  const [trajectoryData, setTrajectoryData] = React.useState<any>(null);

  const [uavTypeBase, setUavTypeBase] = React.useState<string>("DJI Mavic 2"); // для базового изображения
  const [uavTypePlanned, setUavTypePlanned] =
    React.useState<string>("DJI Mavic 2");
  const [distance, setDistance] = React.useState<string>("50");
  const [plannedDistance, setPlannedDistance] = React.useState<string>("");
  const [showEditor, setShowEditor] = React.useState(false);
  const [showView, setShowView] = React.useState(false);
  const [mode, setMode] = React.useState<string>("pan");

  const [angle, setAngle] = React.useState<string>("77");

  const [imageUrl, setImageUrl] = React.useState<string>(imageData.imageUrl);

  const [gridConfig, setGridConfig] = React.useState<{
    columns: number;
    rows: number;
  }>({
    columns: 0,
    rows: 0,
  });

  const handleEditTrajectory = () => {};

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

  const handleDownload = () => {};

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
                  <IconButton
                    color="error"
                    onClick={handleClearScheme}
                    aria-label="Очистить схему"
                    disabled={points.length === 0 && obstacles.length === 0}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Скачать схему" enterDelay={500}>
                  <IconButton
                    onClick={handleDownload}
                    color="primary"
                    aria-label="Скачать схему"
                    disabled={points.length === 0}
                  >
                    <DownloadIcon />
                  </IconButton>
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
                mt: 2,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <SceneShower
                imageData={imageData}
                sceneTitle="Просмотр сцены"
                points={points}
                obstacles={obstacles}
                trajectoryData={trajectoryData}
                showView={() => setShowView(true)}
              />
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
              onGridGenerated={(cols, rows) =>
                setGridConfig({ columns: cols, rows: rows })
              }
              onEditTrajectory={handleEditTrajectory}
              onEditObstacles={() => {
                setShowEditor(true);
                setMode("polygons");
              }}
              onEditUserTrajectory={() => {
                setShowEditor(true);
                setMode("points");
              }}
            />
          </Box>
        </Grid>
      </Grid>

      <Dialog open={showEditor} onClose={() => setShowEditor(false)} fullScreen>
        <DialogContent sx={{ p: 0 }}>
          <SceneEditor
            onClose={() => setShowEditor(false)}
            mode={mode}
            imageData={imageData}
            sceneTitle="Редактор схемы полётов"
            points={points}
            setPoints={setPoints}
            obstacles={obstacles}
            setObstacles={setObstacles}
            trajectoryData={trajectoryData}
            setTrajectoryData={setTrajectoryData}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showView} onClose={() => setShowView(false)} fullScreen>
        <DialogContent sx={{ p: 0 }}>
          <SceneEditor
            onClose={() => setShowView(false)}
            imageData={imageData}
            sceneTitle="Просмотр схемы полётов"
            points={points}
            setPoints={setPoints}
            obstacles={obstacles}
            setObstacles={setObstacles}
            trajectoryData={trajectoryData}
            setTrajectoryData={setTrajectoryData}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default BuildTrajectoryStep;
