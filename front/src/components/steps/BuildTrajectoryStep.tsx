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
import SettingsIcon from "@mui/icons-material/Settings";
import { Tooltip } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices"; // значок "метлы"
import DownloadIcon from "@mui/icons-material/Download";
import FlightPlanningAccordion from "./FlightPlanningAccordion";
import ImageWithSvgOverlay from "../draw/GridCanvas";
import ImageGridCanvas from "../draw/canvas";
import SceneEditor from "../draw/sceneeditor";
import ModeEditIcon from "@mui/icons-material/ModeEdit";

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
  const [uavTypePlanned, setUavTypePlanned] =
    React.useState<string>("DJI Mavic 2"); // для планируемой съёмки
  const [distance, setDistance] = React.useState<string>("50");
  const [plannedDistance, setPlannedDistance] = React.useState<string>("");
  const [showEditor, setShowEditor] = React.useState(false);
  const [mode, setMode] = React.useState<string>("pan");

  // Параметры БПЛА (из диалога)
  const [angle, setAngle] = React.useState<string>("77");
  const [formatX, setFormatX] = React.useState<string>("10");
  const [formatY, setFormatY] = React.useState<string>("10");

  const [openUavParams, setOpenUavParams] = React.useState(false);

  const [imageUrl, setImageUrl] = React.useState<string>(imageData.imageUrl);

  const [gridConfig, setGridConfig] = React.useState<{
    columns: number;
    rows: number;
  }>({
    columns: 0,
    rows: 0,
  });

  const handleEditTrajectory = () => {
    // stub for editing trajectory
  };

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

  const handleViewScheme = React.useCallback(() => {
    // Открыть полноэкранный просмотр схемы
  }, []);

  const handleEditScheme = React.useCallback(() => {
    // Открыть полноэкранный просмотр схемы
    setShowEditor(true);
  }, []);

  const handleClearScheme = React.useCallback(() => {
    // Очистить сетку, траекторию, препятствия и т.д.
  }, []);

  const handleClear = () => {
    setFormatX("10");
    setFormatY("10");
    alert("Сетка очищена!");
  };

  const handleDownload = () => {
    alert("Схема скачана!");
    // Здесь логика скачивания
  };

  const [selectedCell, setSelectedCell] = React.useState<{
    row: number;
    col: number;
  } | null>(null);

  const handleCellClick = (row: number, col: number) => {
    console.log("Клик по ячейке:", row, col);
    setSelectedCell({ row, col });
  };

  // Предположим, ширина и высота кадра вычисляются из других параметров
  const frameWidth = "100"; // пример
  const frameHeight = "75"; // пример

  return (
    <Box sx={{ p: 2 }}>
      {/* {imageUrl && <SceneEditor imageUrl={imageUrl} />} */}
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
              // alignItems: "center",
              width: "100%",
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              Базовый слой
            </Typography>

            <Box
              sx={{
                width: "100%",
                maxHeight: "400px",
                display: "flex",
                justifyContent: "center",
                mb: 1,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {imageUrl && gridConfig.columns == 0 && gridConfig.rows == 0 && (
                <>
                  <img
                    src={imageUrl}
                    alt="Компонент"
                    style={{
                      maxWidth: "100%",
                      objectFit: "contain",
                      borderRadius: "4px",
                    }}
                  />
                </>
              )}

              {imageUrl && gridConfig.columns > 0 && gridConfig.rows > 0 && (
                <ImageWithSvgOverlay imageUrl={imageUrl} />
                // <GridCanvas
                //   imageUrl={imageUrl}
                //   originalWidth={imageData.width!} // ширина оригинала в px
                //   originalHeight={imageData.height!} // высота оригинала в px
                //   gridColumns={gridConfig.columns}
                //   gridRows={gridConfig.rows}
                //   onCellClick={handleCellClick}
                // />
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
              mt: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between", // распределяет элементы по краям
                alignItems: "center",
                gap: 1,
              }}
            >
              {/* Левая группа: иконки действий */}
              <Box sx={{ display: "flex", gap: 1 }}>
                <Tooltip title="Просмотр схемы" enterDelay={500}>
                  <IconButton
                    color="primary"
                    onClick={handleViewScheme} // убедитесь, что эта функция определена
                    aria-label="Просмотр схемы"
                  >
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Редактировать схему" enterDelay={500}>
                  <IconButton
                    color="primary"
                    onClick={handleEditScheme} // убедитесь, что эта функция определена
                    aria-label="Редактор схемы"
                  >
                    <ModeEditIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Очистить схему" enterDelay={500}>
                  <IconButton
                    color="error"
                    onClick={handleClearScheme} // убедитесь, что эта функция определена
                    aria-label="Очистить схему"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Правая часть: кнопка скачивания */}
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
          <Typography variant="h6" sx={{ mb: 1, textAlign: "left" }}>
            Порядок построения траектории
          </Typography>

          <Box sx={{ mt: 1 }}>
            <FlightPlanningAccordion
              onGridGenerated={(cols, rows) =>
                setGridConfig({ columns: cols, rows: rows })
              }
              onEditTrajectory={handleEditTrajectory}
              onEditObstacles={() => { setShowEditor(true); setMode("polygons"); }}
              onEditUserTrajectory={() => { setShowEditor(true); setMode("points"); }}
            />
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

      <Dialog
        open={showEditor}
        onClose={() => setShowEditor(false)}
        fullScreen
      >
        <DialogContent sx={{ p: 0}}>
          <SceneEditor onClose={() => setShowEditor(false)} mode={mode} imageData={imageData} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default BuildTrajectoryStep;
