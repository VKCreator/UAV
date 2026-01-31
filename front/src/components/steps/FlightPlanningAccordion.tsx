import * as React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Button,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ViewListIcon from "@mui/icons-material/ViewList";
import RouteIcon from "@mui/icons-material/Route";
import SettingsIcon from "@mui/icons-material/Settings";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

import useNotifications from "../../hooks/useNotifications/useNotifications";

import { api, Drone } from "../../api/client";

import UavSelector from "../ui-widgets/UavSelector";
import UavParamsDialog, { UavParams } from "../ui-widgets/UavParamsDialog";

export default function FlightPlanningAccordion({
  onGridGenerated,
  onEditTrajectory,
  onEditObstacles,
  onEditUserTrajectory,
}: {
  onGridGenerated?: (cols: number, rows: number) => void;
  onEditTrajectory?: () => void;
  onEditObstacles?: () => void;
  onEditUserTrajectory?: () => void;
}) {
  const notifications = useNotifications();

  const [expanded, setExpanded] = React.useState<Set<string>>(
    new Set(["panel1"])
  );

  // Раскадровка и параметры БПЛА
  const [drones, setDrones] = React.useState<Drone[]>([]);
  const [selectedDroneId, setSelectedDroneId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);

  // const [fov, setFov] = React.useState<number>(77);
  // const [resolutionWidth, setResolutionWidth] = React.useState<number>(5472);
  // const [resolutionHeight, setResolutionHeight] = React.useState<number>(3648);

  const [openUavParams, setOpenUavParams] = React.useState(false);
  const [initialUavParams, setInitialUavParams] = React.useState<UavParams>({
    fov: 77,
    resolutionWidth: 5472,
    resolutionHeight: 3648,
    useFromReference: true,
  });

  const [uavParams, setUavParams] = React.useState<UavParams>(initialUavParams);

  const [distance, setDistance] = React.useState<number>(100);
  const [plannedDistance, setPlannedDistance] = React.useState<number>(15);

  const [isGridGenerated, setIsGridGenerated] = React.useState(false);

  const calculateFrameSize = (d: number, f: number) => {
    const fovRad = (f * Math.PI) / 180;
    return 2 * d * Math.tan(fovRad / 2);
  };

  const frameHeightBase = calculateFrameSize(distance, uavParams.fov);
  const frameWidthBase = frameHeightBase * (3 / 2);
  const frameHeightPlanned = calculateFrameSize(plannedDistance, uavParams.fov);
  const frameWidthPlanned = frameHeightPlanned * (3 / 2);

  const [obstaclesCount, setObstaclesCount] = React.useState(0);
  const [trajectoryPointsCount, setTrajectoryPointsCount] = React.useState(0);

  // === Обработчики аккордеона ===
  const togglePanel = (panel: string) => () => {
    setExpanded((prev) => {
      const newSet = new Set(prev);
      newSet.has(panel) ? newSet.delete(panel) : newSet.add(panel);
      return newSet;
    });
  };

  // === Обработчики действий ===
  const handleUavParamsOpen = () => {
    setOpenUavParams(true);
    setInitialUavParams(uavParams);
    console.info(initialUavParams);
  };

  const handleUavParamsClose = () => {
    console.info(initialUavParams);
    setOpenUavParams(false);
    setUavParams(initialUavParams);
  };

  const handleUavParamsSave = (params: UavParams) => {
    console.log(params);
    setUavParams(params);
    setOpenUavParams(false);
  };

  const handleGenerateStoryboard = () => {
    // Округляем для наложения кадров
    const cols = frameWidthBase / frameWidthPlanned;
    const rows = frameHeightBase / frameHeightPlanned;
    setIsGridGenerated(true);
    if (onGridGenerated) {
      onGridGenerated(cols, rows);
      notifications.show("Раскадровка выполнена", {
        autoHideDuration: 2000,
      });
    }
  };

  const handleClearGrid = () => {
    setIsGridGenerated(false);
    if (onGridGenerated) {
      onGridGenerated(0, 0);
    }
  };

  const handleEditObstacles = () => {
    /* открыть редактор препятствий */
  };

  const handleClearObstacles = () => {
    /* очистить препятствия */
  };

  const handleEditTrajectory = () => {
    /* открыть редактор траектории */
  };

  const handleClearTrajectory = () => {
    /* очистить траекторию */
  };

  const handleDroneChange = (drone: Drone) => {
    setSelectedDroneId(String(drone.id));

    setUavParams({
      fov: drone.fov_vertical || 77,
      resolutionWidth: drone.resolution_width || 5472,
      resolutionHeight: drone.resolution_height || 3648,
      useFromReference: true,
    });
  };

  const handleUseFromReferenceChange = (checked: boolean) => {
    // let params = uavParams;
    // params.useFromReference = checked;
    // setUavParams(params)
    console.error(checked);
    if (checked) {
      const drone = drones.find((d) => String(d.id) === selectedDroneId);
      if (drone) {
        setUavParams({
          fov: drone.fov_vertical || 77,
          resolutionWidth: drone.resolution_width || 5472,
          resolutionHeight: drone.resolution_height || 3648,
          useFromReference: true,
        });
      }
    }
  };

  React.useEffect(() => {
    const fetchDrones = async () => {
      try {
        console.info("Fetching drones...");
        const data = await api.drones.getAll();
        setDrones(data);
        if (data.length > 0) {
          const first = data[0];
          setSelectedDroneId(String(first.id));

          setUavParams({
            fov: first.fov_vertical || 77,
            resolutionWidth: first.resolution_width || 5472,
            resolutionHeight: first.resolution_height || 3648,
            useFromReference: true,
          });
        }
      } catch (error) {
        notifications.show("Не удалось загрузить список БПЛА", {
          severity: "error",
          autoHideDuration: 3000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDrones();

    // if (openUavParams) {
    //   setInitialUavParams(uavParams);
    //   console.info(initialUavParams);
    // }
  }, []);

  return (
    <Box sx={{ width: "100%" }}>
      {/* 1. Раскадровка */}
      <Accordion
        expanded={expanded.has("panel1")}
        onChange={togglePanel("panel1")}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1-content"
          id="panel1-header"
          sx={{ flexDirection: "row-reverse", gap: 1 }}
        >
          <Typography fontWeight={600}>1. Формирование масштабной сетки</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Выбор БПЛА */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <UavSelector
                drones={drones}
                value={selectedDroneId}
                onChange={handleDroneChange}
                loading={loading}
              />
              <Tooltip title="Настройки камеры" enterDelay={500}>
                <IconButton onClick={handleUavParamsOpen} size="small">
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Параметры базового слоя */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
              <Typography fontWeight={600} sx={{ pb: 2 }}>
                Параметры съёмки базового слоя
              </Typography>
              <TextField
                fullWidth
                label="Расстояние от объекта до камеры, м"
                type="number"
                size="small"
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value) || 0)}
                inputProps={{ step: 0.1, min: 0.1 }}
                sx={{ mb: 1.5 }}
              />
              <Typography variant="body2" color="text.secondary">
                Кадр: {frameWidthBase.toFixed(2)} м ×{" "}
                {frameHeightBase.toFixed(2)} м
              </Typography>
            </Paper>

            {/* Параметры планируемой съёмки */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
              <Typography fontWeight={600} sx={{ pb: 2 }}>
                Параметры планируемой съёмки
              </Typography>
              <TextField
                fullWidth
                label="Расстояние от объекта до камеры, м"
                type="number"
                size="small"
                value={plannedDistance}
                onChange={(e) =>
                  setPlannedDistance(Number(e.target.value) || 0)
                }
                slotProps={{
                  htmlInput: { step: 0.1, min: 0.1, max: distance },
                }}
                sx={{ mb: 1.5 }}
              />
              <Typography variant="body2" color="text.secondary">
                Кадр: {frameWidthPlanned.toFixed(2)} м ×{" "}
                {frameHeightPlanned.toFixed(2)} м
              </Typography>
            </Paper>

            {/* Кнопки управления */}
            {/* <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Button
                variant="contained"
                startIcon={<ViewListIcon />}
                onClick={handleGenerateStoryboard}
                size="small"
              >
                Раскадровать
              </Button>
              <Tooltip title="Очистить сетку" enterDelay={500}>
                <IconButton
                  color="error"
                  onClick={handleClearGrid}
                  aria-label="Очистить сетку"
                  size="small"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box> */}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 2. Препятствия */}
      <Accordion
        expanded={expanded.has("panel2")}
        onChange={togglePanel("panel2")}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2-content"
          id="panel2-header"
          sx={{ flexDirection: "row-reverse", gap: 1 }}
        >
          <Typography fontWeight={600}>
            2. Установка препятствий (опционально)
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="body1" color="text.secondary">
              Количество установленных препятствий:{" "}
              <Box
                component="span"
                sx={{ color: "primary.main", fontWeight: 600 }}
              >
                {obstaclesCount}
              </Box>{" "}
              шт.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={onEditObstacles}
                size="small"
              >
                Редактировать
              </Button>
              <Tooltip title="Очистить все препятствия" enterDelay={500}>
                <IconButton
                  color="error"
                  onClick={handleClearObstacles}
                  aria-label="Очистить препятствия"
                  size="small"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 3. Траектория */}
      <Accordion
        expanded={expanded.has("panel3")}
        onChange={togglePanel("panel3")}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel3-content"
          id="panel3-header"
          sx={{ flexDirection: "row-reverse", gap: 1 }}
        >
          <Typography fontWeight={600}>3. Определение точек съёмки</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="body1" color="text.secondary">
              Количество установленных точек съёмки:{" "}
              <Box
                component="span"
                sx={{ color: "primary.main", fontWeight: 600 }}
              >
                {trajectoryPointsCount}
              </Box>{" "}
              шт.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Button
                variant="outlined"
                startIcon={<RouteIcon />}
                onClick={onEditUserTrajectory}
                size="small"
              >
                Редактировать
              </Button>
              <Tooltip title="Очистить траекторию" enterDelay={500}>
                <IconButton
                  color="error"
                  onClick={handleClearTrajectory}
                  aria-label="Очистить траекторию"
                  size="small"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Диалог: Параметры БПЛА */}
      <UavParamsDialog
        open={openUavParams}
        onOpen={handleUavParamsOpen}
        onClose={handleUavParamsClose}
        onSave={handleUavParamsSave}
        initialValues={uavParams}
        onUseFromReferenceChange={handleUseFromReferenceChange}
      />
    </Box>
  );
}
