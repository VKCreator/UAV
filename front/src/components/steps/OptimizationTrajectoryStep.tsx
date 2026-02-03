import React, { useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  IconButton,
  Divider,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Checkbox,
  Button,
  Tabs,
  Tab,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import ViewListIcon from "@mui/icons-material/ViewList";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

import SceneShower from "../draw/SceneShower";

import type { Point, Polygon, ImageData } from "../draw/scene.types";

interface OptimizationTrajectoryStepProps {
  imageData: ImageData;

  points: Point[];
  setPoints: React.Dispatch<React.SetStateAction<Point[]>>;

  obstacles: Polygon[];
  setObstacles: React.Dispatch<React.SetStateAction<Polygon[]>>;

  droneParams: any;
  setDroneParams: (params: any) => void;
}

const OptimizationTrajectoryStep: React.FC<OptimizationTrajectoryStepProps> = ({
  imageData,
  points,
  obstacles,
  droneParams,
}) => {
  const [activeImage, setActiveImage] = React.useState(0);

  const [optimizationMethod, setOptimizationMethod] = React.useState<
    "small" | "large"
  >("small");

  const [windSpeed, setWindSpeed] = React.useState("");
  const [windDirection, setWindDirection] = React.useState("");
  const [useWeatherApi, setUseWeatherApi] = React.useState(false);

  const sceneUserTrajectoryShower = useRef<{ handleDownload: () => void }>(
    null,
  );

  const handleRunOptimization = () => {
    console.log("Оптимизация запущена");
  };

  const handleStoryboard = () => {
    console.log("Раскадровка");
  };

  const trajectoryTitles = [
    "Пользовательская",
    "Оптимизированная (МКТ)",
    "Оптимизированная (БКТ)",
  ];

  const handleNext = () => {
    setActiveImage((prev) => (prev + 1) % trajectoryTitles.length);
  };

  const handleDownloadScene = () => {
    sceneUserTrajectoryShower.current?.handleDownload();
  };
  const renderImage = (index: number) => {
    switch (index) {
      case 1:
        return (
          <SceneShower
            imageData={imageData}
            droneParams={droneParams}
            sceneTitle="Просмотр сцены"
            points={points}
            obstacles={obstacles}
            trajectoryData={null}
            showView={() => {}}
            ref={sceneUserTrajectoryShower}
          />
        );

      default:
        return <Typography>Контент для изображения {index}</Typography>;
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3}>
        {/* Левая часть — схема */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid #e0e0e0",
              borderRadius: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Заголовок */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Typography variant="h6">
                {trajectoryTitles[activeImage]}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 0 }}>
                <Tooltip title="Просмотр" enterDelay={500}>
                  <IconButton color="primary">
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Скачать" enterDelay={500}>
                  <IconButton color="primary" onClick={handleDownloadScene}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>

                {/* Вертикальная палочка */}
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ mr: 2, ml: 1 }}
                />

                {/* Счётчик */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ whiteSpace: "nowrap" }}
                >
                  Траектория: {activeImage + 1} / {trajectoryTitles.length}
                </Typography>

                {/* Стрелка */}
                <IconButton
                  color="primary"
                  onClick={handleNext}
                  aria-label="Следующая траектория"
                  size="small"
                >
                  ❯
                </IconButton>
              </Box>
            </Box>

            <Divider />

            {/* Контент */}
            <Box
              sx={{
                mt: 2,
                width: "100%",
                maxHeight: "400px",
                // bgcolor: "#f4f6f8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                // borderRadius: 1,
              }}
            >
              {renderImage(activeImage + 1)}
              {/* <Typography color="text.secondary">
                Изображение #{activeImage + 1}
              </Typography> */}
            </Box>
          </Paper>
        </Grid>

        {/* Правая часть — аккордеон */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Порядок оптимизации траектории
          </Typography>

          {/* 1. Оптимизация */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>
                1. Оптимизация пользовательской траектории
              </Typography>
            </AccordionSummary>

            <AccordionDetails>
              <Typography variant="subtitle2" gutterBottom>
                Метод оптимизации
              </Typography>

              <RadioGroup
                value={optimizationMethod}
                onChange={(e) => setOptimizationMethod(e.target.value as any)}
              >
                <FormControlLabel
                  value="small"
                  control={<Radio />}
                  label="Малое количество точек"
                />
                <FormControlLabel
                  value="large"
                  control={<Radio />}
                  label="Большое количество точек"
                  disabled
                />
              </RadioGroup>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mt: 2,
                  border: "1px solid #e0e0e0",
                  borderRadius: 1,
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Погодные условия
                </Typography>

                <TextField
                  label="Скорость ветра, м/с"
                  fullWidth
                  size="small"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(e.target.value)}
                  sx={{ mb: 1.5 }}
                />

                <TextField
                  label="Направление ветра, °"
                  fullWidth
                  size="small"
                  value={windDirection}
                  onChange={(e) => setWindDirection(e.target.value)}
                  sx={{ mb: 1.5 }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={useWeatherApi}
                      onChange={(e) => setUseWeatherApi(e.target.checked)}
                    />
                  }
                  label="Получать данные о погоде со стороннего ресурса"
                />
              </Paper>

              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="contained"
                  sx={{ mt: 2 }}
                  startIcon={<PlayArrowIcon />}
                  onClick={handleRunOptimization}
                  size="small"
                >
                  Запустить
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* 2. Раскадровка */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>2. Раскадровка</Typography>
            </AccordionSummary>

            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Раскадровка позволяет сформировать последовательность кадров
                полёта на основе выбранного типа раскадровки и траекторий.
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ViewListIcon />}
                  onClick={handleStoryboard}
                >
                  Раскадровать
                </Button>

                <Typography variant="caption" color="text.secondary">
                  Откроется полноэкранный режим
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OptimizationTrajectoryStep;
