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
} from "@mui/material";

import type { Drone } from "../../api/client";
import type { UAVCameraParams } from "../../types/uav.types";

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
      const drone = drones.find((d) => String(d.id) === selectedDroneId);
      if (drone != undefined) {
        setFov(drone.fov_vertical);
        setResolutionWidth(drone.resolution_width);
        setResolutionHeight(drone.resolution_height);
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
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Настройки камеры БПЛА</DialogTitle>
      <Divider />
      <DialogContent>
        <TextField
          fullWidth
          label="Вертикальный угол обзора камеры, градусы"
          variant="outlined"
          value={fov}
          onChange={(e) => setFov(Number(e.target.value))}
          slotProps={{
            htmlInput: { type: "number", min: 1, max: 180, step: 0.1 },
          }}
          sx={{ mb: 2, mt: 1 }}
          disabled={useFromReference}
        />

        <TextField
          fullWidth
          label="Разрешение по ширине, px"
          variant="outlined"
          value={resolutionWidth}
          onChange={(e) => setResolutionWidth(Number(e.target.value))}
          slotProps={{ htmlInput: { type: "number", min: 1, step: 1 } }}
          sx={{ mb: 2 }}
          disabled={useFromReference}
        />

        <TextField
          fullWidth
          label="Разрешение по высоте, px"
          variant="outlined"
          value={resolutionHeight}
          onChange={(e) => setResolutionHeight(Number(e.target.value))}
          slotProps={{ htmlInput: { type: "number", min: 1, step: 1 } }}
          sx={{ mb: 2 }}
          disabled={useFromReference}
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
