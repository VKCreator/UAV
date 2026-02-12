import {
  Box,
  Stack,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@mui/material";

import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

type Point = [number, number];

interface Taxon {
  region: number;
  base: [number, number];
  points: [number, number][];
  time_sec: number;
  route: [number, number][];
  warning: string;
  color: string;
}

interface Props {
  taxon: Taxon;
  index: number;
}

export const TaxonCard = ({ taxon, index }: Props) => {
  const formatPoint = (p: Point) =>
    `(${p[0].toFixed(1)} м, ${p[1].toFixed(1)} м)`;

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        mt: 2,
        p: 2,
        pb: 1,
        borderRadius: 2,
        border: "1px solid #e0e0e0",
        backgroundColor: "#fafafa",
      }}
    >
      {/* Заголовок */}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: taxon.color,
          }}
        />
        <Typography fontWeight={600}>Таксон №{index + 1}</Typography>
      </Stack>

      <Stack spacing={0.5} sx={{ mt: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          Область исследования: №{taxon.region}
        </Typography>

        <Typography>
          <b>База:</b> {formatPoint(taxon.base)}
        </Typography>

        <Typography>
          <b>Время полёта:</b> {taxon.time_sec.toFixed(1)} с
        </Typography>

        <Typography>
          <b>Количество точек съёмки:</b> {taxon.points.length} шт.
        </Typography>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Stack spacing={1}>
        {taxon.route && (
          <Accordion
            elevation={0}
            sx={{
              backgroundColor: "transparent",
              border: "1px dashed #ddd",
              borderRadius: 1,
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={500}>Полный маршрут</Typography>
            </AccordionSummary>

            <AccordionDetails>
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                {taxon.route.map(formatPoint).join(" → ")}
              </Typography>
            </AccordionDetails>
          </Accordion>
        )}
      </Stack>

      {taxon.warning && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
          <WarningAmberRoundedIcon color="error" />
          <Typography color="error">{taxon.warning}</Typography>
        </Stack>
      )}

      {!taxon.warning && ( 
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
          <CheckCircleOutlineIcon color="success" />
          <Typography color="success">{"Превышения по времени нет"}</Typography>
        </Stack>
      )}
    </Box>
  );
};
