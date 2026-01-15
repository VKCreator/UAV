import * as React from "react";
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Box,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { useNavigate } from "react-router";
import Tooltip from "@mui/material/Tooltip";

import ImageUploadStep from "./ImageUploadStep";
import BuildTrajectoryStep from "./BuildTrajectoryStep";
import PolygonTool from "./PolygonTool";

import ExifData from "./ImageUploadStep";

interface ExifData {
  fileName: string;
  fileSize: string;
  width?: number;
  height?: number;
  dateTime?: string;
  make?: string;
  model?: string;
  orientation?: number;
  xResolution?: number;
  yResolution?: number;
  resolutionUnit?: number;
  software?: string;
  artist?: string;
  copyright?: string;
  focalLength: number;
  focalLengthIn35mmFormat: number;
  latitude: string;
  longitude: string;
}

const TrajectoryStepper: React.FC<{
  onSubmit: () => void;
  onReset: () => void;
}> = ({ onSubmit, onReset }) => {
  const [activeStep, setActiveStep] = React.useState(0);
  const [schemaName, setSchemaName] = React.useState("Схема 1"); // начальное название
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dialogValue, setDialogValue] = React.useState("");
  const [error, setError] = React.useState("");
  const navigate = useNavigate();

  const [files, setFiles] = React.useState<File[]>([]);
  const [exifData, setExifData] = React.useState<ExifData[]>([]);
  const [imageUrl, setImageUrl] = React.useState<string>("");

  const handleImageUpload = (newFiles: File[], newExif: ExifData[]) => {
    setFiles(newFiles);
    setExifData(newExif);
    if (imageUrl) {
      console.info("очищена память");
      URL.revokeObjectURL(imageUrl);
      setImageUrl(String());
    }
  };

  const handleImageDelete = () => {
    setFiles([]);
    setExifData([]);

    if (imageUrl) {
      console.info("очищена память in delete");
      URL.revokeObjectURL(imageUrl);
      setImageUrl(String());
    }
  };

  const steps = [
    "Загрузка базового слоя",
    "Построение траектории",
    "Оптимизация траектории",
    "Сравнение траекторий",
  ];

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    } else navigate("/trajectories");
  };

  const handleOpenDialog = () => {
    setDialogValue(schemaName);
    setError("");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setError("");
  };

  const handleSaveSchemaName = () => {
    if (!dialogValue.trim()) {
      setError("Название схемы обязательно");
      return;
    }
    if (dialogValue.length > 50) {
      setError("Название не должно превышать 50 символов");
      return;
    }

    setSchemaName(dialogValue.trim());
    handleCloseDialog();
  };

  React.useEffect(() => {
    console.info("new image");
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setImageUrl(url);

      return () => {
        console.info("useEffect", "clear memory");
        URL.revokeObjectURL(url);
      };
    }
  }, [files]);

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 90px)",
        overflow: "hidden",
      }}
    >
      {/* Название схемы + карандаш */}
      <Box
        sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1, pl: 2 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 400 }}>
          Название:
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 300 }}>
          {schemaName}
        </Typography>
        <Tooltip title="Изменить">
          <IconButton size="small" onClick={handleOpenDialog}>
            <EditIcon fontSize="small" color="action" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Степпер */}
      <Box sx={{ pt: 2, pb: 0, pl: 0, pr: 0, flexShrink: 0, overflow: "auto" }}>
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            "& .MuiStepIcon-root": {
              "&.Mui-active": {
                color: "#014488ff", // активный шаг
              },
              "&.Mui-completed": {
                color: "#014488ff", // завершённый шаг
              },
            },
            borderBottom: "1px solid #e0e0e0",
            paddingBottom: 2
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Область контента — прокручивается */}
      <Box
        sx={{
          flex: 1, // Занимает всё оставшееся место
          overflowY: "auto", // Скролл только здесь
          p: 1,
        }}
      >
        {activeStep === 0 ? (
          <ImageUploadStep
            onUpload={handleImageUpload}
            onDelete={handleImageDelete}
            initialFiles={files}
            initialExifData={exifData}
            initialImageUrl={imageUrl}
          />
        ) : activeStep === 1 ? (
          <BuildTrajectoryStep
            imageData={{
              imageUrl,
              fileName: files[0]?.name || "",
              width: exifData[0]?.width,
              height: exifData[0]?.height,
            }}
          />
        ) : activeStep === 2 ? (
          <PolygonTool />
        ) : (
          <Paper sx={{ p: 3, height: "2000px" }}>
            <Typography variant="h6" gutterBottom>
              {steps[activeStep]}
            </Typography>
            <Typography variant="body1">
              Содержимое шага {activeStep + 1}. Lorem ipsum dolor sit amet,
              consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
              labore et dolore magna aliqua. Ut enim ad minim veniam, quis
              nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
              consequat. Duis aute irure dolor in reprehenderit in voluptate
              velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint
              occaecat cupidatat non proident, sunt in culpa qui officia
              deserunt mollit anim id est laborum.
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Кнопки зафиксированы внизу */}
      <Box
        sx={{
          p: 2,
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid #e0e0e0",
        }}
      >
        <Button
          // disabled={activeStep === 0}
          onClick={handleBack}
          variant="outlined"
          startIcon={<KeyboardArrowLeftIcon />}
        >
          Назад
        </Button>

        <Button
          onClick={activeStep === steps.length - 1 ? onSubmit : handleNext}
          variant="contained"
          color="primary"
          endIcon={<KeyboardArrowRightIcon />}
          disabled={activeStep === 0 && imageUrl == ""}
        >
          {activeStep === steps.length - 1 ? "Создать" : "Далее"}
        </Button>
      </Box>

      {/* Диалоговое окно */}
      <Dialog
        open={isDialogOpen}
        onClose={(event, reason) => {
          if (reason !== "backdropClick") {
            handleCloseDialog();
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Изменить название схемы</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название схемы"
            type="text"
            fullWidth
            variant="outlined"
            value={dialogValue}
            onChange={(e) => {
              const newValue = e.target.value;
              setDialogValue(newValue);
              if (newValue.trim() !== "") {
                setError("");
              } else setError("Название схемы обязательно");
            }}
            error={!!error}
            helperText={error}
            inputProps={{
              maxLength: 50,
            }}
          />
          {!error && (
            <Typography
              variant="caption"
              color="textSecondary"
              align="right"
              sx={{ pl: "14px" }}
            >
              Количество символов: {dialogValue.length}/50
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="outlined">
            Отмена
          </Button>
          <Button
            onClick={handleSaveSchemaName}
            variant="contained"
            color="primary"
            disabled={!!error}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrajectoryStepper;
