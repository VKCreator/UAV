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

export interface UavParams {
  fov: number;
  resolutionWidth: number;
  resolutionHeight: number;
  useFromReference: boolean;
}

interface UavParamsDialogProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSave: (params: UavParams) => void;
  initialValues: UavParams;
  onUseFromReferenceChange: (checked: boolean) => void;
}

export default function UavParamsDialog({
  open,
  onOpen,
  onClose,
  onSave,
  initialValues,
  onUseFromReferenceChange,
}: UavParamsDialogProps) {
  const [fov, setFov] = React.useState<number>(initialValues.fov);
  const [resolutionWidth, setResolutionWidth] = React.useState<number>(
    initialValues.resolutionWidth
  );
  const [resolutionHeight, setResolutionHeight] = React.useState<number>(
    initialValues.resolutionHeight
  );
  const [useFromReference, setUseFromReference] = React.useState<boolean>(
    initialValues.useFromReference
  );

  // Сбрасываем локальное состояние при открытии
  React.useEffect(() => {
    if (open) {
      setFov(initialValues.fov);
      setResolutionWidth(initialValues.resolutionWidth);
      setResolutionHeight(initialValues.resolutionHeight);
      setUseFromReference(initialValues.useFromReference);
    //   onOpen();
    }
  }, [open, initialValues, onOpen]);

  const handleSave = () => {
    console.info("handleSave", fov)
    onSave({
      fov,
      resolutionWidth,
      resolutionHeight,
      useFromReference,
    });
    // onClose();
  };

  const handleClose = (_: object, reason: "backdropClick") => {
    if (reason === "backdropClick") {
      return; // игнорируем
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose} // ← используем кастомный обработчик
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
          Разрешения должны совпадать с разрешениями базового слоя.
        </Typography>
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={useFromReference}
                onChange={(e) => {onUseFromReferenceChange(e.target.checked); setUseFromReference(e.target.checked);}}
              />
            }
            label="Применять значения из справочника"
          />
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Отмена
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
