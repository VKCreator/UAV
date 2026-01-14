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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import SettingsIcon from "@mui/icons-material/Settings";

// Тип для данных из первого шага
interface ImageData {
  imageUrl: string;
  fileName: string;
  width?: number;
  height?: number;
}

const BuildTrajectoryStep: React.FC<{
  imageData: ImageData; // передаём данные из первого шага
}> = ({ imageData }) => {
  const [uavTypeBase, setUavTypeBase] = React.useState<string>("DJI Mavic 2"); // для базового изображения
  const [uavTypePlanned, setUavTypePlanned] = React.useState<string>("DJI Mavic 2"); // для планируемой съёмки
  const [distance, setDistance] = React.useState<string>("50");
  const [plannedDistance, setPlannedDistance] = React.useState<string>("");

  // Параметры БПЛА (из диалога)
  const [angle, setAngle] = React.useState<string>("77");
  const [formatX, setFormatX] = React.useState<string>("10");
  const [formatY, setFormatY] = React.useState<string>("10");

  const [openUavParams, setOpenUavParams] = React.useState(false);

  const [imageUrl, setImageUrl] = React.useState<string>(imageData.imageUrl);

  React.useEffect(() => {
    setImageUrl(imageData.imageUrl);
  }, [imageData.imageUrl]);

  const handleUavParamsOpen = () => {
    setOpenUavParams(true);
  };

  const handleUavParamsClose = () => {
    setOpenUavParams(false);
  };

  const handleUavParamsSave = () => {
    alert("Параметры БПЛА сохранены!");
    handleUavParamsClose();
  };

  const handleBuildTrajectory = () => {
    alert("Траектория построена!");
    // Здесь логика построения траектории
  };

  const handleGenerateGrid = () => {
    alert("Сетка сформирована!");
    // Здесь логика генерации сетки
  };

  const handleClear = () => {
    setFormatX("10");
    setFormatY("10");
    alert("Сетка очищена!");
  };

  const handleDownload = () => {
    alert("Схема скачана!");
    // Здесь логика скачивания
  };

  // Предположим, ширина и высота кадра вычисляются из других параметров
  const frameWidth = "100"; // пример
  const frameHeight = "75"; // пример

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3}>
        {/* Левая колонка — изображение */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid #e0e0e0",
              borderRadius: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, textAlign: "center" }}>
              Базовое изображение
            </Typography>

            <Box
              sx={{
                width: "100%",
                maxHeight: "400px",
                display: "flex",
                justifyContent: "center",
                mb: 2,
              }}
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Компонент"
                  style={{
                    maxWidth: "100%",
                    objectFit: "contain",
                    borderRadius: "4px",
                  }}
                />
              )}
            </Box>
          </Paper>

          {/* Новая карточка с действиями */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid #e0e0e0",
              borderRadius: 1,
              mt: 2, // отступ сверху
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
              }}
            >
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleBuildTrajectory}
                color="primary"
                disabled
              >
                Построить траекторию
              </Button>

              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                color="primary"
              >
                Скачать схему
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Правая колонка — всё остальное */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" sx={{ mb: 2, textAlign: "left" }}>
            Настройки параметров для формирования сетки кадров
          </Typography>

          {/* Карточка: Параметры базового изображения */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid #e0e0e0",
              borderRadius: 1,
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Параметры базового изображения
            </Typography>

            {/* Тип БПЛА для базового изображения + шестерёнка */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 2,
              }}
            >
              <FormControl fullWidth>
                <InputLabel>Тип БПЛА</InputLabel>
                <Select
                  value={uavTypeBase}
                  label="Тип БПЛА"
                  onChange={(e) => setUavTypeBase(e.target.value)}
                >
                  <MenuItem value="DJI Mavic 2">DJI Mavic 2</MenuItem>
                  {/* можно добавить другие варианты */}
                </Select>
              </FormControl>
              <IconButton onClick={handleUavParamsOpen}>
                <SettingsIcon />
              </IconButton>
            </Box>

            <TextField
              fullWidth
              label="Расстояние от объекта до камеры, м"
              variant="outlined"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              inputProps={{ type: "number" }}
              sx={{ mb: 2 }}
            />

            {/* Ширина и высота кадра на одной строке */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                fullWidth
                label="Ширина кадра, м"
                variant="outlined"
                value={frameWidth}
                disabled
              />
              <TextField
                fullWidth
                label="Высота кадра, м"
                variant="outlined"
                value={frameHeight}
                disabled
              />
            </Box>
          </Paper>

          {/* Карточка: Параметры планируемой съёмки */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid #e0e0e0",
              borderRadius: 1,
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Параметры планируемой съёмки
            </Typography>

            {/* Тип БПЛА для планируемой съёмки + шестерёнка */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 2,
              }}
            >
              <FormControl fullWidth>
                <InputLabel>Тип БПЛА</InputLabel>
                <Select
                  value={uavTypePlanned}
                  label="Тип БПЛА"
                  onChange={(e) => setUavTypePlanned(e.target.value)}
                >
                  <MenuItem value="DJI Mavic 2">DJI Mavic 2</MenuItem>
                  {/* можно добавить другие варианты */}
                </Select>
              </FormControl>
              <IconButton onClick={handleUavParamsOpen}>
                <SettingsIcon />
              </IconButton>
            </Box>

            <TextField
              fullWidth
              label="Расстояние от объекта до камеры, м"
              variant="outlined"
              value={plannedDistance}
              onChange={(e) => setPlannedDistance(e.target.value)}
              inputProps={{ type: "number" }}
            />
          </Paper>

          {/* Кнопки без карточки */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 1,
            }}
          >
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleGenerateGrid}
            >
              Сформировать сетку
            </Button>

            <Button
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={handleClear}
            >
              Очистить
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Диалог: Параметры БПЛА */}
      <Dialog
        open={openUavParams}
        onClose={handleUavParamsClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Параметры БПЛА</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Угол раскрытия, градусов"
            variant="outlined"
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            inputProps={{ type: "number", min: 1, max: 180 }}
            sx={{ mb: 2, mt: 2 }}
          />
          <TextField
            fullWidth
            label="Эквивалент формата X"
            variant="outlined"
            value={formatX}
            onChange={(e) => setFormatX(e.target.value)}
            inputProps={{ type: "number", min: 1, max: 100 }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Эквивалент формата Y"
            variant="outlined"
            value={formatY}
            onChange={(e) => setFormatY(e.target.value)}
            inputProps={{ type: "number", min: 1, max: 100 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUavParamsClose} color="secondary">
            Отмена
          </Button>
          <Button
            onClick={handleUavParamsSave}
            variant="contained"
            color="primary"
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BuildTrajectoryStep;