import {
  Box,
  Stack,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Grid
} from "@mui/material";

import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

type Point = [number, number];

interface Segment {
  p_from: [number, number, any];
  p_to: [number, number, number];
  TA: number;
  TC: {
    source: string;
    parsedValue: number;
  };
  DA: number;
  GS: number;
  time_move: number;
  time_total: number;
  nose_end: [number, number];
  wind_speed: number;
  wind_dir_deg: number;
  TAS: number;
}

interface Taxon {
  region: number;
  base: [number, number];
  points: [number, number][];
  time_sec: number;
  route: [number, number][];
  warning: string;
  color: string;
  segments?: Segment[];
}

interface Props {
  taxon: Taxon;
  index: number;
}

// Компонент для отображения навигационных параметров сегмента
const SegmentDetails = ({ segment, segIndex }: { segment: Segment; segIndex: number }) => {
  const getTCValue = (tc: any): number => {
    if (typeof tc === 'object' && tc !== null) {
      return tc.parsedValue ?? tc.source ?? 0;
    }
    return tc || 0;
  };

  const tcValue = getTCValue(segment.TC);

  const segmentLength = Math.hypot(
    segment.p_to[0] - segment.p_from[0],
    segment.p_to[1] - segment.p_from[1]
  );

  return (
    <Accordion
      elevation={0}
      sx={{
        backgroundColor: "#f5f5f5",
        border: "1px solid #e0e0e0",
        borderRadius: 1,
        mt: 1,
        '&:not(:last-of-type)': {
            borderBottom: '1px solid',
            borderColor: '#ddd',
        },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={2} alignItems="center" width="100%">
          <Chip
            label={`Сегмент ${segIndex + 1}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Typography variant="body2" color="text.secondary">
            Длина: {segmentLength.toFixed(2)} м
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Время: {segment.time_total.toFixed(2)} с
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={1.5}>
          {/* Угловые параметры */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'white', height: "100%" }}>
              <Typography variant="subtitle2" gutterBottom color="primary.dark">
                Угловые параметры
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row">TA (Курс)</TableCell>
                    <TableCell align="right">
                      <strong>{segment.TA.toFixed(2)}°</strong>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">TC (Путевой угол)</TableCell>
                    <TableCell align="right">
                      <strong>{tcValue.toFixed(2)}°</strong>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">DA (Угол сноса)</TableCell>
                    <TableCell align="right">
                      <strong>{segment.DA.toFixed(2)}°</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          {/* Скоростные параметры */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'white' }}>
              <Typography variant="subtitle2" gutterBottom color="primary.dark">
                Скоростные параметры
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row">TAS (Рабочая скорость)</TableCell>
                    <TableCell align="right">
                      <strong>{segment.TAS.toFixed(2)} м/с</strong>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">GS (Путевая скорость)</TableCell>
                    <TableCell align="right">
                      <strong>{segment.GS.toFixed(4)} м/с</strong>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">Ветер</TableCell>
                    <TableCell align="right">
                      <strong>{segment.wind_speed.toFixed(2)} м/с</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          {/* Временные параметры */}
          <Grid size={{ xs: 12 }}>
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'white' }}>
              <Typography variant="subtitle2" gutterBottom color="primary.dark">
                Временные параметры
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row">Время движения</TableCell>
                    <TableCell align="right">{segment.time_move.toFixed(2)} с</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">Общее время</TableCell>
                    <TableCell align="right">{segment.time_total.toFixed(2)} с</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export const TaxonCard = ({ taxon, index }: Props) => {
  const formatPoint = (p: Point) =>
    `(${p[0].toFixed(1)} м, ${p[1].toFixed(1)} м)`;

  // Расчет полной дистанции маршрута
  const totalDistance = taxon.route.reduce((sum, point, i) => {
    if (i === 0) return 0;
    const prev = taxon.route[i - 1];
    return sum + Math.hypot(point[0] - prev[0], point[1] - prev[1]);
  }, 0);

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
      {/* Заголовок с цветным кружком */}
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
        {/* Полный маршрут */}
        {taxon.route && (
          <Accordion
            sx={{
              backgroundColor: "transparent",
              border: "1px dashed #ddd",
              borderRadius: 1,
              '&:not(:last-of-type)': {
                borderBottom: '1px dashed',
                borderColor: '#ddd',
              },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography fontWeight={500}>Полный маршрут</Typography>
                <Typography variant="caption" color="text.secondary">
                  Дистанция: {totalDistance.toFixed(2)} м
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                {taxon.route.map(formatPoint).join(" → ")}
              </Typography>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Сегменты с навигационными параметрами */}
        {taxon.segments && taxon.segments.length > 0 && (
          <Accordion
            elevation={0}
            sx={{
              backgroundColor: "transparent",
              border: "1px dashed #ddd",
              borderRadius: 1
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={500}>
                Навигационные параметры
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                {taxon.segments.map((segment, segIdx) => (
                  <SegmentDetails key={segIdx} segment={segment} segIndex={segIdx} />
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}
      </Stack>

      {/* Предупреждение или сообщение об успехе */}
      {taxon.warning && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
          <WarningAmberRoundedIcon color="error" />
          <Typography color="error">{taxon.warning}</Typography>
        </Stack>
      )}

      {!taxon.warning && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
          <CheckCircleOutlineIcon color="success" />
          <Typography color="success">Превышения по времени нет</Typography>
        </Stack>
      )}
    </Box>
  );
};