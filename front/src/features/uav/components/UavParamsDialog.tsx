// src/components/UavParamsDialog.tsx
import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  Typography,
  Box,
  Divider,
  IconButton,
  InputAdornment
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import type { Drone } from "../types/uav.types";

import type { UAVCameraParams } from "../../../types/uav.types";

import { FloatInput } from "../../../components/ui/FloatInput";
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import WidthNormalIcon from '@mui/icons-material/WidthNormal';
import HeightIcon from '@mui/icons-material/Height';


interface UavParamsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (params: UAVCameraParams) => void;
  initialValues: UAVCameraParams;
  drones: Drone[];
  selectedDroneId: string | number | undefined;
}

export default function UavParamsDialog({
  open,
  onClose,
  onSave,
  initialValues,
  drones,
  selectedDroneId,
}: UavParamsDialogProps) {
  const [fov, setFov] = React.useState<number>(initialValues.fov);
  const [resolutionWidth, setResolutionWidth] = React.useState<number>(
    initialValues.resolutionWidth,
  );
  const [resolutionHeight, setResolutionHeight] = React.useState<number>(
    initialValues.resolutionHeight,
  );
  const [useFromReference, setUseFromReference] = React.useState<boolean>(
    initialValues.useFromReference,
  );

  // Сбрасываем локальное состояние при открытии
  React.useEffect(() => {
    if (open) {
      setFov(initialValues.fov);
      setResolutionWidth(initialValues.resolutionWidth);
      setResolutionHeight(initialValues.resolutionHeight);
      setUseFromReference(initialValues.useFromReference);
    }
  }, [open]);

  const handleUseFromReferenceChange = (checked: boolean) => {
    if (checked) {
      const drone = drones.find((d) => String(d.drone_id) === selectedDroneId);
      if (drone != undefined) {
        setFov(drone.default_vertical_fov);
        setResolutionWidth(drone.default_resolution_width);
        setResolutionHeight(drone.default_resolution_height);
        setUseFromReference(true);
      }
    }
  };

  const handleSave = () => {
    onSave({
      fov,
      resolutionWidth,
      resolutionHeight,
      useFromReference,
    });
  };

  const handleClose = (
    _: object,
    reason: "backdropClick" | "escapeKeyDown",
  ) => {
    if (reason === "escapeKeyDown" || reason === "backdropClick") {
      return; // игнорируем
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
    >
      <DialogTitle sx={{ pr: 5 }}>
      Настройки камеры БПЛА
        <IconButton
          aria-label="Закрыть"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{width: "500px"}}>
        <FloatInput
          fullWidth
          label="Вертикальный угол обзора камеры, градусы"
          value={fov}
          onChange={(val) => setFov(val)}
          min={1}
          max={180}
          sx={{ mb: 2, mt: 1 }}
          disabled={useFromReference}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CameraAltIcon sx={{ color: 'action.active' }} />
              </InputAdornment>
            ),
          }}
        />

        <FloatInput
          fullWidth
          label="Разрешение по ширине, px"
          value={resolutionWidth}
          onChange={(val) => setResolutionWidth(val)}
          min={1}
          max={10000}
          sx={{ mb: 2 }}
          disabled={useFromReference}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <WidthNormalIcon sx={{ color: 'action.active' }} />
              </InputAdornment>
            ),
          }}
        />

        <FloatInput
          fullWidth
          label="Разрешение по высоте, px"
          value={resolutionHeight}
          onChange={(val) => setResolutionHeight(val)}
          min={1}
          max={10000}
          sx={{ mb: 2 }}
          disabled={useFromReference}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <HeightIcon sx={{ color: 'action.active' }} />
              </InputAdornment>
            ),
          }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Базовый слой не должен быть обрезанным изображением или после
          преобразований. Разрешения фотокамеры должны совпадать с разрешениями
          базового слоя.
        </Typography>
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={useFromReference}
                onChange={(e) => {
                  handleUseFromReferenceChange(e.target.checked);
                  setUseFromReference(e.target.checked);
                }}
              />
            }
            label="Применять значения из справочника"
          />
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions>
        <Button onClick={onClose} variant="outlined" color="secondary">
          Отмена
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
