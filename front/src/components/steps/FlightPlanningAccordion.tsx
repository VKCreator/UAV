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
  Chip,
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
import type { Polygon, Point, ImageData } from "../draw/scene.types";
import type { DroneParams, UAVCameraParams } from "../../types/uav.types";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

import { DeleteButton } from "../ui-widgets/DeleteButton";

const DRONES_CACHE_KEY = "drones-cache-v1";

export default function FlightPlanningAccordion({
  imageData,
  obstacles,
  points,
  onClearObstacles,
  onClearUserTrajectory,
  onEditObstacles,
  onEditUserTrajectory,
  onUpdateDroneParams,
  droneParams,
  setDroneParams,
}: {
  imageData: ImageData;
  obstacles: Polygon[];
  points: Point[];
  onEditObstacles: () => void;
  onEditUserTrajectory: () => void;
  onClearObstacles: () => void;
  onClearUserTrajectory: () => void;
  onUpdateDroneParams: (params: DroneParams) => void; // Тип пропса
  droneParams: DroneParams;
  setDroneParams: React.Dispatch<React.SetStateAction<DroneParams>>;
}) {
  const notifications = useNotifications();
  const updateSource = React.useRef<"init" | "props" | "user">("init");

  const [expanded, setExpanded] = React.useState<Set<string>>(
    new Set(["panel1"]),
  );

  // Раскадровка и параметры БПЛА
  const [drones, setDrones] = React.useState<Drone[]>([]);
  const [selectedDroneId, setSelectedDroneId] = React.useState<
    string | number | undefined
  >(droneParams.selectedDroneId);
  const [loading, setLoading] = React.useState(true);

  const [openUavParams, setOpenUavParams] = React.useState(false);
  const [initialUavParams, setInitialUavParams] =
    React.useState<UAVCameraParams>({
      fov: droneParams.uavParams.fov,
      resolutionWidth: droneParams.uavParams.resolutionWidth,
      resolutionHeight: droneParams.uavParams.resolutionHeight,
      useFromReference: droneParams.uavParams.useFromReference,
    });

  const [uavCameraParams, setUavCameraParams] = React.useState<UAVCameraParams>(
    droneParams.uavParams,
  );

  const [uavParams, setUavParams] = React.useState<any>({
    model: droneParams.model,
    speed: droneParams.speed,
    hoverTime: droneParams.hoverTime,
    batteryTime: droneParams.batteryTime,
    considerObstacles: droneParams.considerObstacles,
    windResistance: droneParams.windResistance,
  });

  const [distance, setDistance] = React.useState<number>(droneParams.distance);
  const [plannedDistance, setPlannedDistance] = React.useState<number>(
    droneParams.plannedDistance,
  );

  const calculateFrameSize = (d: number, f: number) => {
    const fovRad = (f * Math.PI) / 180;
    return 2 * d * Math.tan(fovRad / 2);
  };

  const frameHeightBase = calculateFrameSize(distance, uavCameraParams.fov);
  const frameWidthBase =
    frameHeightBase *
    (uavCameraParams.resolutionWidth / uavCameraParams.resolutionHeight);
  const frameHeightPlanned = calculateFrameSize(
    plannedDistance,
    uavCameraParams.fov,
  );
  const frameWidthPlanned =
    frameHeightPlanned *
    (uavCameraParams.resolutionWidth / uavCameraParams.resolutionHeight);

  const isResolutionMatch =
    uavCameraParams.resolutionWidth === imageData.width &&
    uavCameraParams.resolutionHeight === imageData.height;

  const togglePanel = (panel: string) => () => {
    setExpanded((prev) => {
      const newSet = new Set(prev);
      newSet.has(panel) ? newSet.delete(panel) : newSet.add(panel);
      return newSet;
    });
  };

  const handleUavParamsOpen = () => {
    setOpenUavParams(true);
    setInitialUavParams(uavCameraParams);
  };

  const handleUavParamsClose = () => {
    setOpenUavParams(false);
    setUavCameraParams(initialUavParams);
  };

  const handleUavParamsSave = (params: UavParams) => {
    updateSource.current = "user";

    setUavCameraParams(params);
    setOpenUavParams(false);
  };

  const handleDroneChange = (drone: Drone) => {
    updateSource.current = "user";

    setSelectedDroneId(String(drone.id));

    setUavCameraParams({
      fov: drone.fov_vertical || 77,
      resolutionWidth: drone.resolution_width || 5472,
      resolutionHeight: drone.resolution_height || 3648,
      useFromReference: true,
    });

    setUavParams({
      speed: drone.min_speed! * 5,
      batteryTime: drone.battery_life,
      hoverTime: uavParams.hoverTime,
      windResistance: drone.max_wind_resistance,
      considerObstacles: uavParams.considerObstacles,
      model: drone.model
    });
  };

  const handleUseFromReferenceChange = (checked: boolean) => {
    if (checked) {
      const drone = drones.find((d) => String(d.id) === selectedDroneId);
      if (drone) {
        setUavCameraParams({
          fov: drone.fov_vertical || 77,
          resolutionWidth: drone.resolution_width || 5472,
          resolutionHeight: drone.resolution_height || 3648,
          useFromReference: true,
        });
        // setUavParams({
        //   speed: drone.min_speed! * 5,
        //   batteryTime: drone.battery_life,
        //   hoverTime: uavParams.hoverTime,
        //   windResistance: drone.max_wind_resistance,
        //   considerObstacles: uavParams.considerObstacles,
        // });
      }
    }
  };

  React.useEffect(() => {
    const fetchDrones = async () => {
      try {
        const cached = sessionStorage.getItem(DRONES_CACHE_KEY);
        let data: Drone[] = [];

        if (cached) {
          data = JSON.parse(cached);
          setDrones(JSON.parse(cached));
        } else {
          data = await api.drones.getAll();
          sessionStorage.setItem(DRONES_CACHE_KEY, JSON.stringify(data));
          setDrones(data);
        }

        if (data.length > 0) {
          const id = Number(droneParams?.selectedDroneId);
          if (Number.isFinite(id)) {
            setUavCameraParams(droneParams.uavParams);
            setSelectedDroneId(String(droneParams.selectedDroneId));
          } else {
            let first = data[0];

            setUavCameraParams({
              fov: first.fov_vertical || 77,
              resolutionWidth: first.resolution_width || 5472,
              resolutionHeight: first.resolution_height || 3648,
              useFromReference: true,
            });

            setSelectedDroneId(String(first.id));
            setUavParams({
              speed: first.min_speed! * 5,
              batteryTime: first.battery_life,
              hoverTime: uavParams.hoverTime,
              windResistance: first.max_wind_resistance,
              considerObstacles: uavParams.considerObstacles,
              model: first.model
            });
          }

          setDroneParams((prev: DroneParams) => ({
            ...prev,
            selectedDroneId: selectedDroneId,
            frameHeightBase,
            frameWidthBase,
            frameHeightPlanned,
            frameWidthPlanned,
            distance,
            plannedDistance,
            uavParams: uavCameraParams,
          }));
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
  }, []);

  React.useEffect(() => {
    if (updateSource.current !== "user") return;

    // Отправляем данные обратно в родительский компонент каждый раз, когда изменяются параметры
    if (onUpdateDroneParams) {
      onUpdateDroneParams({
        selectedDroneId,
        frameHeightBase,
        frameWidthBase,
        frameHeightPlanned,
        frameWidthPlanned,
        distance,
        plannedDistance,
        uavParams: uavCameraParams,
        speed: uavParams.speed,
        windResistance: uavParams.windResistance,
        hoverTime: uavParams.hoverTime,
        considerObstacles: uavParams.considerObstacles,
        batteryTime: uavParams.batteryTime,
        model: uavParams.model
      });
    }
  }, [selectedDroneId, distance, plannedDistance, uavCameraParams]);

  return (
    <Box sx={{ width: "100%" }}>
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
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            width="100%"
          >
            {/* Левая часть: заголовок + помощь */}
            <Box display="flex" alignItems="center">
              <Typography fontWeight={600}>
                1. Создание масштабной сетки
              </Typography>

              <Tooltip
                title="Масштабная сетка используется для визуальной привязки объектов и расчёта расстояний. На данном этапе вы выбираете БПЛА и параметры съёмки, на основе которых строится сетка."
                arrow
                enterDelay={400}
              >
                <IconButton
                  size="small"
                  component="span"
                  sx={{ m: 0, p: 0, ml: 1 }}
                >
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Статус */}
            <Tooltip
              title={
                isResolutionMatch
                  ? "Разрешение базового слоя совпадает с параметрами камеры"
                  : `Несовпадение разрешений:
           изображение ${imageData.width}×${imageData.height} px,
           камера ${uavCameraParams.resolutionWidth}×${uavCameraParams.resolutionHeight} px`
              }
              arrow
              enterDelay={400}
            >
              <Chip
                size="small"
                label={isResolutionMatch ? "OK" : "Несовпадение форматов"}
                color={isResolutionMatch ? "success" : "error"}
                variant="outlined"
              />
            </Tooltip>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <UavSelector
                drones={drones}
                value={String(selectedDroneId)}
                onChange={handleDroneChange}
                loading={loading}
              />
              <Tooltip title="Настройки камеры" enterDelay={500}>
                <IconButton onClick={handleUavParamsOpen} size="small">
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </Box>

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
                onChange={(e) => {
                  updateSource.current = "user";
                  setDistance(Number(e.target.value) || 0);
                }}
                inputProps={{ step: 0.1, min: 0.1 }}
                sx={{ mb: 1.5 }}
              />
              <Typography variant="body2" color="text.secondary">
                Кадр: {frameWidthBase.toFixed(2)} м ×{" "}
                {frameHeightBase.toFixed(2)} м
              </Typography>
            </Paper>

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
                onChange={(e) => {
                  updateSource.current = "user";
                  setPlannedDistance(Number(e.target.value) || 0);
                }}
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
          </Box>
        </AccordionDetails>
      </Accordion>

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
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            width="100%"
          >
            {/* Заголовок + подсказка */}
            <Box display="flex" alignItems="center">
              <Typography fontWeight={600}>2. Установка препятствий</Typography>

              <Tooltip
                title="Установка препятствий позволяет учитывать объекты на местности, которые необходимо облететь при построении траектории полёта."
                arrow
                enterDelay={400}
              >
                <IconButton
                  size="small"
                  component="span"
                  sx={{ m: 0, p: 0, ml: 1 }}
                >
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Chip статуса */}
            <Tooltip
              title={
                obstacles.length > 0
                  ? `Добавлено препятствий: ${obstacles.length} шт.`
                  : "Шаг можно пропустить, препятствия не заданы"
              }
              arrow
              enterDelay={400}
            >
              <Chip
                size="small"
                label={obstacles.length > 0 ? "Добавлено" : "Опционально"}
                color={obstacles.length > 0 ? "success" : "default"}
                variant="outlined"
              />
            </Tooltip>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="body1" color="text.secondary">
              Количество установленных препятствий:{" "}
              <Box
                component="span"
                sx={{ color: "text.secondary", fontWeight: 600 }}
              >
                {obstacles.length}
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

              <DeleteButton
                onClick={onClearObstacles}
                disabled={obstacles.length === 0}
                tooltip="Очистить все препятствия"
              ></DeleteButton>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

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
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            width="100%"
          >
            {/* Левая часть */}
            <Box display="flex" alignItems="center">
              <Typography fontWeight={600}>
                3. Определение точек съёмки
              </Typography>

              <Tooltip
                title="Установка точек съёмки позволяет задать точки для построения пользовательской траектории полёта."
                arrow
                enterDelay={400}
              >
                <IconButton
                  size="small"
                  component="span"
                  sx={{ m: 0, p: 0, ml: 1 }}
                >
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Статус */}
            <Tooltip
              title={
                points.length > 0
                  ? "Точки съёмки заданы"
                  : "Нужно установить точки съёмки"
              }
              arrow
              enterDelay={400}
            >
              <Chip
                size="small"
                label={points.length > 0 ? `Выполнено` : "Не задано"}
                color={points.length > 0 ? "success" : "error"}
                variant="outlined"
              />
            </Tooltip>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="body1" color="text.secondary">
              Количество установленных точек съёмки:{" "}
              <Box
                component="span"
                sx={{ color: "text.secondary", fontWeight: 600 }}
              >
                {points.length}
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

              <DeleteButton
                onClick={onClearUserTrajectory}
                disabled={points.length === 0}
                tooltip="Очистить траекторию"
              ></DeleteButton>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      <UavParamsDialog
        open={openUavParams}
        onOpen={handleUavParamsOpen}
        onClose={handleUavParamsClose}
        onSave={handleUavParamsSave}
        initialValues={uavCameraParams}
        onUseFromReferenceChange={handleUseFromReferenceChange}
      />
    </Box>
  );
}
