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
  Grid,
  IconButton
} from "@mui/material";
import { TaxonCard } from "./TaxonCard";
import CloseIcon from "@mui/icons-material/Close";

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

interface OptimizationDetailDialogProps {
  open: boolean;
  onClose: () => void;
  trajectoryData: TrajectoryData | null;
  trajectoryData2: TrajectoryData | null;
  trajectoryData3: TrajectoryData | null;
}

const OptimizationDetailDialog: FC<OptimizationDetailDialogProps> = ({
  open,
  onClose,
  trajectoryData,
  trajectoryData2,
  trajectoryData3,
}) => {
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (_: any, value: number) => {
    setTabIndex(value);
  };

  const handleDialogClose = (
    _: unknown,
    reason?: "backdropClick" | "escapeKeyDown",
  ) => {
    if (reason === "escapeKeyDown" || reason === "backdropClick") return;
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 5 }}>
        Детали оптимизации
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
      <DialogContent
        sx={{
          height: "70vh",
          display: "flex",
          flexDirection: "column",
          p: 2
        }}
      >
        <Tabs value={tabIndex} onChange={handleTabChange}>
          <Tab label="Метод 1 (НПТ)" />
          <Tab label="Метод 2 (ВПТ)" />
          <Tab label="Метод 3 (СПТ)" />
        </Tabs>

        <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
          {tabIndex === 0 && (
            <TabContent data={trajectoryData} method="Метод 1" />
          )}
          {tabIndex === 1 && <TabContent data={trajectoryData2} method="Метод 2" />}
          {tabIndex === 2 && <TabContent data={trajectoryData3} method="Метод 3" />}
        </Box>

        {/* <Box textAlign="right" mt={2}>
          <Divider sx={{ mb: 2 }} />
          <Button onClick={onClose} variant="outlined">
            Закрыть
          </Button>
        </Box> */}
      </DialogContent>
    </Dialog>
  );
};

export default OptimizationDetailDialog;

const TabContent: FC<{
  data: TrajectoryData | null;
  method: string;
}> = ({ data, method }) => {

  const totalFlightTime = data?.B.reduce((sum, taxon) => sum + taxon.time_sec, 0) ?? 0;

  if (!data) {
    return (
      <Typography color="text.secondary" sx={{ pt: 2 }}>
        Нет данных оптимизации для отображения.
      </Typography>
    );
  }

  return (
    <Box>
      <Stack spacing={1} my={2}>
        {/* <Typography>
          <b>Количество областей исследования:</b> {data.N_k} шт.
        </Typography> */}

        <Typography>
          <b>Количество таксонов:</b> {data.B.length} шт.
        </Typography>
        <Typography>
          <b>Количество недостижимых точек:</b> {data.C.length} шт.
        </Typography>
        <Typography>
          <b>Общее время полёта:</b> {totalFlightTime.toFixed(1)} с
        </Typography>
      </Stack>

      <Divider sx={{ mb: 1 }} />

      <Grid container spacing={2}>
        {data.B.map((taxon, idx) => (
          <Grid size={{ xs: 12, md: 12 }} key={idx}>
            <TaxonCard taxon={taxon} index={idx} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
