import { FC, useState } from "react";
import {
  Box,
  Typography,
  Divider,
  Stack,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import SceneCanvas from "./SceneCanvas";
import StoryboardTimeline from "./StoryboardTimeline";

interface StoryboardEditorProps {
  onClose: () => void;

  // данные сцены
  imageData: any;
  points: any[];
  obstacles: any[];
  trajectoryData?: any;

  // свойства раскадровки
  framesCount: number;
  memoryMb: number;
  flightTimeSec: number;
}

type StoryboardType = "point" | "recommended" | "optimal";

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
  const [storyboardType, setStoryboardType] = useState<StoryboardType>("point");

  const [selectedFrame, setSelectedFrame] = useState(0);

  const frames = points.map((p, i) => ({
    id: `frame-${i}`,
    index: i,
    time: i * 2,
  }));

  const handleApply = () => {
    console.log("Применить тип раскадровки:", storyboardType);
    // здесь дальше:
    // - пересчёт кадров
    // - запрос к API
    // - генерация раскадровки
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

      <Box display="flex" flex={1} overflow="auto">
        {/* Левая панель */}
        <Box
          width={350}
          borderRight="1px solid"
          borderColor="divider"
          p={2}
          height="100%"
          overflow="auto"
        >
          <Stack spacing={2}>
            {/* Тип раскадровки */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Тип раскадровки
              </Typography>

              <RadioGroup
                value={storyboardType}
                onChange={(e) =>
                  setStoryboardType(e.target.value as StoryboardType)
                }
              >
                <FormControlLabel
                  value="point"
                  control={<Radio />}
                  label="Точечная"
                />
                <FormControlLabel
                  value="recommended"
                  control={<Radio />}
                  label="Рекомендуемая"
                />
                <FormControlLabel
                  value="optimal"
                  control={<Radio />}
                  label="Оптимальная"
                />
              </RadioGroup>

              <Button
                fullWidth
                variant="contained"
                size="small"
                onClick={handleApply}
                sx={{ mt: 1 }}
              >
                Применить
              </Button>
            </Box>

            <Divider />

            {/* Свойства раскадровки */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Свойства раскадровки
              </Typography>

              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Количество кадров
                  </Typography>
                  <Typography fontWeight="bold">{framesCount}</Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Объём памяти
                  </Typography>
                  <Typography fontWeight="bold">{memoryMb} МБ</Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Общее время облёта
                  </Typography>
                  <Typography fontWeight="bold">{flightTimeSec} сек</Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Box>

        {/* Правая сцена */}
        <Box
          flex={1}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          bgcolor="#f4f6f8"
          flexDirection="column"
          gap={0}
          sx={{ pt: 3 }}
          overflow="auto"
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
