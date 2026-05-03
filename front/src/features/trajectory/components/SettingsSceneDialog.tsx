import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  FormControlLabel,
  Divider,
  Box,
  Typography,
  Checkbox,
  IconButton
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  
  // Настройки отображения
  showNavigationTriangles: boolean;
  setShowNavigationTriangles: (value: boolean) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onClose,
  showNavigationTriangles,
  setShowNavigationTriangles,
}) => {
  
  const handleDialogClose = (
    _: unknown,
    reason?: "backdropClick" | "escapeKeyDown",
  ) => {
    if (reason === "escapeKeyDown" || reason === "backdropClick") return;
    onClose();
  }; 

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2 }}>
        Настройки отображения
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          
          {/* Группа: Траектория */}
          <Typography variant="subtitle2" color="textSecondary">
            Объекты на схеме
          </Typography>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={showNavigationTriangles}
                onChange={(e) => setShowNavigationTriangles(e.target.checked)}
              />
            }
            label="Навигационные треугольники"
          />
          <Typography variant="caption" color="textSecondary" sx={{ ml: 4 }}>
            {showNavigationTriangles 
              ? "Показывать треугольники скоростей" 
              : "Показывать синие векторы воздушной скорости"}
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};