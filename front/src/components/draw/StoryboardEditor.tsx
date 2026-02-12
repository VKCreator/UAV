import { FC, useState, JSX } from "react";
import {
  Box,
  Typography,
  Divider,
  Button,
  IconButton,
  Stack,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

import CircleIcon from "@mui/icons-material/Circle";
import RecommendIcon from "@mui/icons-material/Recommend";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

import SceneCanvas from "./SceneCanvas";
import StoryboardTimeline from "./StoryboardTimeline";

interface StoryboardEditorProps {
  onClose: () => void;

  imageData: any;
  points: any[];
  obstacles: any[];
  trajectoryData?: any;

  framesCount: number;
  memoryMb: number;
  flightTimeSec: number;
}

type StoryboardType = "point" | "recommended" | "optimal";

const typeConfigs: Record<
  StoryboardType,
  { label: string; icon: JSX.Element; description: string }
> = {
  point: {
    label: "Точечная",
    icon: <CircleIcon fontSize="small" />,
    description: "Создаёт раскадровку только по отдельным точкам пользовательского маршрута.",
  },
  recommended: {
    label: "Рекомендуемая",
    icon: <RecommendIcon fontSize="small" />,
    description:
      "Формируется на основе всего фасада исследуемого объекта.",
  },
  optimal: {
    label: "Оптимальная",
    icon: <AutoAwesomeIcon fontSize="small" />,
    description:
      "Строится на основе направления оптимальной траектории полёта.",
  },
};

const StoryboardEditor: FC<StoryboardEditorProps> = ({
  onClose,
  imageData,
  points,
  obstacles,
  trajectoryData,
  framesCount,
  memoryMb,
  flightTimeSec,
}) => {
  const [activeType, setActiveType] = useState<StoryboardType | null>("point");
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [frameSize, setFrameSize] = useState(100);

  const frames = points.map((p, i) => ({
    id: `frame-${i}`,
    index: i,
    time: i * 2,
  }));

  const toggleType = (type: StoryboardType) => {
    setActiveType((prev) => (prev === type ? null : type));
  };

  const handleApply = () => {
    console.log(
      "Применить раскадровку:",
      activeType,
      "Размер кадра:",
      frameSize,
    );
  };

  const handleReset = () => {
    setFrameSize(100);
    console.log("Сброс параметров для:", activeType);
  };

  return (
    <Box display="flex" flexDirection="column" height="100%" width="100%">
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        p={1}
        borderBottom="1px solid"
        borderColor="divider"
        bgcolor="background.paper"
      >
        <IconButton size="small" onClick={onClose}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="medium">
          Редактор раскадровки
        </Typography>
      </Box>

      <Box display="flex" flex={1} overflow="hidden">
        {/* Левая панель — вертикальное меню */}
        <Box
          width={120}
          borderRight="1px solid"
          borderColor="divider"
          p={1}
          display="flex"
          flexDirection="column"
          gap={1}
        >
          {(Object.keys(typeConfigs) as StoryboardType[]).map((type) => {
            const config = typeConfigs[type];
            const isActive = activeType === type;
            return (
              <Box
                key={type}
                onClick={() => toggleType(type)}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  userSelect: "none",
                  // bgcolor: isActive ? "primary.dark" : "transparent",
                  color: isActive ? "primary.dark" : "text.primary",
                  borderRadius: 2,
                  py: 1,
                  px: 0.5,
                  "&:hover": {
                    color: isActive ? "primary.dark" : "text.primary", // при наведении тоже меняем цвет текста
                    bgcolor: isActive
                      ? "transparent"
                      : "          rgba(0, 78, 158, 0.08)",
                  },
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    toggleType(type);
                    e.preventDefault();
                  }
                }}
              >
                <IconButton
                  size="large"
                  sx={{
                    color: "inherit",
                    p: 0,
                    mb: 0.5,
                    pointerEvents: "none",
                  }}
                  aria-label={config.label}
                  tabIndex={-1}
                >
                  {config.icon}
                </IconButton>
                <Typography
                  variant="caption"
                  sx={{ fontSize: "12px" }}
                  component="span"
                  align="center"
                >
                  {config.label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Панель инструментов для выбранного типа */}
        {activeType && (
          <Box
            width={250}
            borderRight="1px solid"
            borderColor="divider"
            p={2}
            display="flex"
            flexDirection="column"
            gap={2}
          >
            <Typography variant="subtitle1">
              {typeConfigs[activeType].label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {typeConfigs[activeType].description}
            </Typography>

            {/* Размер кадра */}
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Размер кадра
              </Typography>
              {/* <input
                type="number"
                value={frameSize}
                onChange={(e) => setFrameSize(Number(e.target.value))}
                style={{ width: "100%" }}
              /> */}
            </Box>

            {/* Кнопки применить/сбросить */}
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="contained" fullWidth onClick={handleApply}>
                Применить
              </Button>
              <Button size="small" variant="outlined" fullWidth onClick={handleReset}>
                Сбросить
              </Button>
            </Stack>
          </Box>
        )}

        {/* Правая панель — сцена + таймлайн */}
        <Box
          flex={1}
          display="flex"
          flexDirection="column"
          bgcolor="#f4f6f8"
          overflow="auto"
          alignItems="center"
          justifyContent="space-between"
          gap={2}
          pt={2}
        >
          <SceneCanvas
            imageData={imageData}
            points={points}
            obstacles={obstacles}
            trajectoryData={trajectoryData}
            showPoints
            showObstacles
            showTaxons
          />
          <StoryboardTimeline
            frames={frames}
            selectedIndex={selectedFrame}
            onSelect={setSelectedFrame}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default StoryboardEditor;
