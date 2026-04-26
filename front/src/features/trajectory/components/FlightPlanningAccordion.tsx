import * as React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Paper,
  TextField,
  IconButton,
  Button,
  Tooltip,
  Chip,
  Badge
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SettingsIcon from "@mui/icons-material/Settings";
import EditIcon from "@mui/icons-material/Edit";

import { Drone } from "../../../features/uav/types/uav.types";

import UavSelector from "../../uav/components/UavSelector";
import UavParamsDialog from "../../uav/components/UavParamsDialog";
import { FloatInput } from "../../../components/ui/FloatInput";

import type { Polygon, Point, ImageData } from "../../../types/scene.types";
import type { DroneParams, UAVCameraParams } from "../../../types/uav.types";

import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

import { DeleteButton } from "../../../components/ui/DeleteButton";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

import { keyframes } from "@mui/system";

const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(2); opacity: 0; }
  100% { transform: scale(1); opacity: 0; }
`;

export default function FlightPlanningAccordion({
  imageData,
  obstacles,
  points,
  drones,
  onClearObstacles,
  onClearUserTrajectory,
  onEditObstacles,
  onEditUserTrajectory,
  onEditLine,
  onResetLine,
  droneParams,
  setDroneParams,
  flightLineY,
}: {
  imageData: ImageData;
  obstacles: Polygon[];
  points: Point[];
  drones: Drone[];
  onEditObstacles: () => void;
  onEditUserTrajectory: () => void;
  onClearObstacles: () => void;
  onClearUserTrajectory: () => void;
  onEditLine: () => void;
  onResetLine: () => void;
  droneParams: DroneParams;
  setDroneParams: React.Dispatch<React.SetStateAction<DroneParams>>;
  flightLineY: number;
}) {
  const [expanded, setExpanded] = React.useState<Set<string>>(
    new Set(["panel1"]),
  );

  const [loading, setLoading] = React.useState(drones.length === 0);

  const [openUavParams, setOpenUavParams] = React.useState(false);

  const isResolutionMatch =
    droneParams.uavCameraParams.resolutionWidth === imageData.width &&
    droneParams.uavCameraParams.resolutionHeight === imageData.height;

  const togglePanel = (panel: string) => () => {
    setExpanded((prev) => {
      const newSet = new Set(prev);
      newSet.has(panel) ? newSet.delete(panel) : newSet.add(panel);
      return newSet;
    });
  };

  const handleUavParamsOpen = () => {
    setOpenUavParams(true);
  };

  const handleUavParamsClose = () => {
    setOpenUavParams(false);
  };

  const handleUavParamsSave = (params: UAVCameraParams) => {
    setDroneParams((prev) => ({
      ...prev,
      uavCameraParams: params,
    }));
    handleUavParamsClose();
  };

  const handleDroneChange = (drone: Drone) => {
    setDroneParams((prev) => ({
      ...prev,
      selectedDroneId: String(drone.drone_id),
      uavCameraParams: {
        fov: drone.default_vertical_fov,
        resolutionWidth: drone.default_resolution_width,
        resolutionHeight: drone.default_resolution_height,
        useFromReference: true,
      },
      speed: drone.min_speed + 5,
      batteryTime: drone.max_battery_life,
      windResistance: drone.max_wind_resistance,
      model: drone.model,
    }));
  };

  React.useEffect(() => {
    setLoading(drones.length == 0);
  }, [drones]);

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
           камера ${droneParams.uavCameraParams.resolutionWidth}×${droneParams.uavCameraParams.resolutionHeight} px`
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
                value={String(droneParams.selectedDroneId)}
                onChange={handleDroneChange}
                loading={loading}
              />
              <Tooltip title="Настройки камеры" enterDelay={500}>
                <Badge
                  color="warning"
                  variant="dot"
                  overlap="circular"
                  invisible={isResolutionMatch}
                  sx={{
                    "& .MuiBadge-dot": {},
                    "& .MuiBadge-dot::after": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      backgroundColor: "warning.main",
                      animation: `${pulse} 1.5s ease-out infinite`,
                    },
                  }}
                >
                  <IconButton onClick={handleUavParamsOpen} size="small">
                    <SettingsIcon />
                  </IconButton>
                </Badge>
              </Tooltip>
            </Box>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
              <Typography fontWeight={600} sx={{ pb: 2 }}>
                Параметры съёмки базового слоя
              </Typography>
              <FloatInput
                fullWidth
                label="Расстояние от объекта до камеры, м"
                value={droneParams.distance}
                onChange={(val) => {
                  setDroneParams((prev) => ({ ...prev, distance: val }))

                  if (val < droneParams.plannedDistance) {
                    setDroneParams((prev) => ({ ...prev, plannedDistance: val }))
                  }
                }}
                min={0.1}
                sx={{ mb: 1.5 }}
              />
              <Typography variant="body2" color="text.secondary">
                Кадр: {droneParams.frameWidthBase.toFixed(2)} м ×{" "}
                {droneParams.frameHeightBase.toFixed(2)} м
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
              <Typography fontWeight={600} sx={{ pb: 2 }}>
                Параметры планируемой съёмки
              </Typography>
              <FloatInput
                fullWidth
                label="Расстояние от объекта до камеры, м"
                value={droneParams.plannedDistance}
                onChange={(val) => {
                  const maxValue = droneParams.distance;
                  const correctedValue = Math.min(val, maxValue);
                  setDroneParams((prev) => ({ ...prev, plannedDistance: correctedValue }))
                }}
                min={0.1}
                max={droneParams.distance}
                sx={{ mb: 1.5 }}
              />
              <Typography variant="body2" color="text.secondary">
                Кадр: {droneParams.frameWidthPlanned.toFixed(2)} м ×{" "}
                {droneParams.frameHeightPlanned.toFixed(2)} м
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
              <Typography fontWeight={600}>
                2. Установка линии взлёта/посадок
              </Typography>

              <Tooltip
                title="Линия определяет положение размещения точек взлёта/посадок БПЛА."
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
                flightLineY != imageData.height
                  ? `Линия установлена`
                  : "Шаг можно пропустить, линия по умолчанию"
              }
              arrow
              enterDelay={400}
            >
              <Chip
                size="small"
                label={
                  flightLineY != imageData.height ? "Настроено" : "Опционально"
                }
                color={flightLineY != imageData.height ? "success" : "default"}
                variant="outlined"
              />
            </Tooltip>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              gap: 1,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body1" color="text.secondary">
              Позиция линии:{" "}
              <Box
                component="span"
                sx={{ color: "text.secondary", fontWeight: 600 }}
              >
                {((imageData.height - flightLineY) * droneParams.frameHeightBase / imageData.height).toFixed(2)}
              </Box>
              {" м"}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="Редактировать" arrow>
                <span>
                  <IconButton onClick={onEditLine} size="small" color="primary">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Сбросить" arrow>
                <span>
                  <IconButton
                    size="small"
                    onClick={onResetLine}
                    color="primary"
                    disabled={flightLineY == imageData.height}
                  >
                    <RestartAltIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
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
            {/* Заголовок + подсказка */}
            <Box display="flex" alignItems="center">
              <Typography fontWeight={600}>3. Установка препятствий</Typography>

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
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              gap: 1,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
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
            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="Редактировать" arrow>
                <span>
                  <IconButton
                    onClick={onEditObstacles}
                    size="small"
                    color="primary"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

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
        expanded={expanded.has("panel4")}
        onChange={togglePanel("panel4")}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel4-content"
          id="panel4-header"
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
                4. Определение точек съёмки
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
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              gap: 1,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
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
            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="Редактировать" arrow>
                <span>
                  <IconButton
                    onClick={onEditUserTrajectory}
                    size="small"
                    color="primary"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

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
        onClose={handleUavParamsClose}
        onSave={handleUavParamsSave}
        initialValues={droneParams.uavCameraParams}
        drones={drones}
        selectedDroneId={droneParams.selectedDroneId}
      />
    </Box>
  );
}
