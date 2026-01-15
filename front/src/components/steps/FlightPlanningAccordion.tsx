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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ViewListIcon from "@mui/icons-material/ViewList";
import BlockIcon from "@mui/icons-material/Block";
import RouteIcon from "@mui/icons-material/Route";
import SettingsIcon from "@mui/icons-material/Settings";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

// === Типы и константы ===
const UAV_OPTIONS = [
  { value: "DJI Mavic 2", label: "DJI Mavic 2" },
  // добавьте другие при необходимости
];

export default function FlightPlanningAccordion() {
  // === Состояния ===
  const [expanded, setExpanded] = React.useState<Set<string>>(
    new Set(["panel1"])
  );

  const [uavTypeBase, setUavTypeBase] = React.useState<string>("DJI Mavic 2");
  const [distance, setDistance] = React.useState<number>(50);
  const [plannedDistance, setPlannedDistance] = React.useState<number>(50);

  // Мок-данные (замените на реальные)
  const obstaclesCount = 2;
  const trajectoryPointsCount = 2;
  const frameWidthBase = 2;
  const frameHeightBase = 3;
  const frameWidthPlanned = 3;
  const frameHeightPlanned = 4;

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
    alert("Открыть кастомные параметры БПЛА"); // замените на модалку
  };

  const handleGenerateStoryboard = () => {
    /* логика генерации сетки */
  };

  const handleClearGrid = () => {
    /* очистка сетки */
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

  return (
    <Box sx={{ width: "100%" }}>
      {/* 1. Раскадровка */}
      <Accordion expanded={expanded.has("panel1")} onChange={togglePanel("panel1")}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1-content"
          id="panel1-header"
          sx={{ flexDirection: "row-reverse", gap: 1 }}
        >
          <Typography fontWeight={600}>1. Раскадровка</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Выбор БПЛА */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Тип БПЛА</InputLabel>
                <Select
                  value={uavTypeBase}
                  label="Тип БПЛА"
                  onChange={(e) => setUavTypeBase(e.target.value)}
                >
                  {UAV_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip title="Настройки камеры" enterDelay={500}>
                <IconButton onClick={handleUavParamsOpen} size="small">
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Параметры базового слоя */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
              <Typography fontWeight={600} sx={{ pb: 1 }} gutterBottom>
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
                Кадр: {frameWidthBase.toFixed(2)} м × {frameHeightBase.toFixed(2)} м
              </Typography>
            </Paper>

            {/* Параметры планируемой съёмки */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
              <Typography fontWeight={600} sx={{ pb: 1 }} gutterBottom>
                Параметры планируемой съёмки
              </Typography>
              <TextField
                fullWidth
                label="Расстояние от объекта до камеры, м"
                type="number"
                size="small"
                value={plannedDistance}
                onChange={(e) => setPlannedDistance(Number(e.target.value) || 0)}
                inputProps={{ step: 0.1, min: 0.1, max: distance }} // ← исправлено!
                sx={{ mb: 1.5 }}
              />
              <Typography variant="body2" color="text.secondary">
                Кадр: {frameWidthPlanned.toFixed(2)} м × {frameHeightPlanned.toFixed(2)} м
              </Typography>
            </Paper>

            {/* Кнопки управления */}
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
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
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 2. Препятствия */}
      <Accordion expanded={expanded.has("panel2")} onChange={togglePanel("panel2")}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2-content"
          id="panel2-header"
          sx={{ flexDirection: "row-reverse", gap: 1 }}
        >
          <Typography fontWeight={600}>2. Определение препятствий (опционально)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="body1" color="text.secondary">
              Количество установленных препятствий:{" "}
              <Box component="span" sx={{ color: "primary.main", fontWeight: 600 }}>
                {obstaclesCount}
              </Box>{" "}
              шт.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEditObstacles}
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
      <Accordion expanded={expanded.has("panel3")} onChange={togglePanel("panel3")}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel3-content"
          id="panel3-header"
          sx={{ flexDirection: "row-reverse", gap: 1 }}
        >
          <Typography fontWeight={600}>3. Траектория</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="body1" color="text.secondary">
              Количество установленных точек съёмки:{" "}
              <Box component="span" sx={{ color: "primary.main", fontWeight: 600 }}>
                {trajectoryPointsCount}
              </Box>{" "}
              шт.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Button
                variant="outlined"
                startIcon={<RouteIcon />}
                onClick={handleEditTrajectory}
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
    </Box>
  );
}