import React, { FC, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Typography,
  Box,
  Divider,
  Stack,
  Button,
} from "@mui/material";

interface TrajectoryPoint {
  x: number;
  y: number;
  color?: string;
  number?: number;
}

interface Taxon {
  region: number;
  base: [number, number];
  points: [number, number][];
  time_sec: number;
  route: [number, number][];
  warning: string;
}

interface TrajectoryData {
  N_k: number;
  B: Taxon[];
}

interface OptimizationDialogProps {
  open: boolean;
  onClose: () => void;
  trajectoryData: TrajectoryData | null;
}

const OptimizationDialog: FC<OptimizationDialogProps> = ({
  open,
  onClose,
  trajectoryData,
}) => {
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (_: any, value: number) => {
    setTabIndex(value);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Детали оптимизации</DialogTitle>
      <Divider />
      <DialogContent>
        <Tabs value={tabIndex} onChange={handleTabChange}>
          <Tab label="Метод 1" />
          <Tab label="Метод 2" />
        </Tabs>

        <Box sx={{ mt: 2 }}>
          {tabIndex === 0 && (
            <TabContent data={trajectoryData} method="Метод 1" />
          )}
          {tabIndex === 1 && <TabContent data={null} method="Метод 2" />}
        </Box>

        <Box textAlign="right" mt={2}>
          <Divider sx={{ mb: 2 }} />
          <Button onClick={onClose}>Закрыть</Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default OptimizationDialog;

const TabContent: FC<{
  data: TrajectoryData | null;
  method: string;
}> = ({ data, method }) => {
  if (!data) {
    return (
      <Typography color="text.secondary">
        Нет данных оптимизации для отображения.
      </Typography>
    );
  }

  return (
    <Box overflow="auto">
      <Stack spacing={1} my={2}>
        <Typography>
          <b>Количество областей исследования:</b> {data.N_k}
        </Typography>

        <Typography>
          <b>Количество таксонов:</b> {data.B.length}
        </Typography>
      </Stack>

      <Divider />

      {data.B.map((taxon, idx) => (
        <Box
          key={idx}
          sx={{
            mt: 2,
            p: 2,
            border: "1px solid #e0e0e0",
            borderRadius: 1,
          }}
        >
          <Typography fontWeight={600}>Таксон {idx + 1}</Typography>

          <Stack spacing={1} sx={{ mt: 1 }}>
            <Typography>
              <b>База:</b> [{taxon.base[0]}, {taxon.base[1]}]
            </Typography>

            <Typography>
              <b>Время полёта, сек:</b> {taxon.time_sec.toFixed(2)}
            </Typography>

            <Typography>
              <b>Количество точек:</b> {taxon.points.length}
            </Typography>

            {taxon.warning && (
              <Typography>
                <b>Количество точек:</b> {taxon.warning}
              </Typography>
            )}
            <Typography>
              <b>Точки маршрута:</b>{" "}
              {taxon.points
                .map((p) => `[${p[0].toFixed(2)}, ${p[1].toFixed(2)}]`)
                .join(", ")}
            </Typography>

            {taxon.route && (
              <Typography>
                <b>Полный маршрут:</b>{" "}
                {taxon.route
                  .map((p) => `[${p[0].toFixed(2)}, ${p[1].toFixed(2)}]`)
                  .join(" - ")}
              </Typography>
            )}
          </Stack>
        </Box>
      ))}
    </Box>
  );
};
