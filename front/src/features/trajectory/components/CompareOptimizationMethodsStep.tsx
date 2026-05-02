import React, { useState, useMemo } from "react";
import {
  Tab,
  Tabs,
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Card,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio
} from "@mui/material";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Storyboards, Storyboard } from "../../../types/storyboards.types";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
);

// ─── Типы ─────────────────────────────────────────────────────────────────────

type RoutePoint = [number, number, number];

interface Taxon {
  base: [number, number];
  points: RoutePoint[];
  time_sec: number;
  route: RoutePoint[];
  color?: string;
}

interface TrajectoryData {
  N_k: number;
  B: Taxon[];
  C: [number, number][];
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
};

interface CompareOptimizationMethodsStepProps {
  trajectoryData: TrajectoryData | null;
  trajectoryData2: TrajectoryData | null;
  trajectoryData3: TrajectoryData | null;
  storyboardsData: Storyboards | null;
  priorityMethod: string,
  setPriorityMethod: React.Dispatch<React.SetStateAction<any>>;
}

// Утилиты 

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m} мин ${s} с` : `${seconds.toFixed(2)} с`;
};

const formatCoord = (v: number): string => v.toFixed(2);

// Компоненты

const EmptyState: React.FC = () => (
  <Paper variant="outlined" sx={{ m: 2, p: 4, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 1, color: "text.secondary" }}>
    <Typography variant="body1">Результаты оптимизации отсутствуют.</Typography>
  </Paper>
);

const SummaryCards: React.FC<{ taxonsCount: number; totalPoints: number; unreachableCount: number; totalTime: number }> = ({
  taxonsCount, totalPoints, unreachableCount, totalTime
}) => {
  const cards = [
    { label: "такcонов", value: taxonsCount },
    { label: "точек охвачено", value: totalPoints },
    { label: "недостижимых", value: unreachableCount, color: unreachableCount > 0 ? "warning.main" : "text.secondary" },
    { label: "общее время", value: formatTime(totalTime) },
  ];

  return (
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
      {cards.map((card, idx) => (
        <Card key={idx} variant="outlined" sx={{ p: 2, flex: 1, minWidth: 140, textAlign: "center" }}>
          <Typography variant="h4" fontWeight={700} sx={{ color: "#014488" }}>
            {card.value}
          </Typography>
          <Typography variant="caption" color={card.color || "text.secondary"}>
            {card.label}
          </Typography>
        </Card>
      ))}
    </Box>
  );
};

const UnreachablePoints: React.FC<{ points: [number, number][] }> = ({ points }) => {
  if (points.length === 0) return null;

  return (
    <Alert severity="warning" sx={{ mt: 2 }} icon={
      <svg width={20} height={20} style={{ flexShrink: 0, marginTop: 2 }}>
        <circle cx={10} cy={10} r={8} fill="rgba(255,107,53,0.15)" stroke="#FF6B35" strokeWidth={1.5} />
        <line x1={6} y1={6} x2={14} y2={14} stroke="#FF6B35" strokeWidth={2} />
        <line x1={14} y1={6} x2={6} y2={14} stroke="#FF6B35" strokeWidth={2} />
      </svg>
    }>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
        Недостижимые точки: {points.length} шт.
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
        Квадрокоптер не может посетить эти точки в рамках ограничений заряда батареи.
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
        {points.map((pt, i) => (
          <Chip key={i} size="small" label={`(${formatCoord(pt[0])} м, ${formatCoord(pt[1])} м)`} sx={{
            bgcolor: "rgba(255,107,53,0.1)",
            border: "1px solid #FF6B35",
            color: "text.primary",
            fontSize: "0.7rem",
          }} />
        ))}
      </Box>
    </Alert>
  );
};

const TaxonTimeChart: React.FC<{ taxons: Taxon[] }> = ({ taxons }) => {
  const chartData = useMemo(() => {
    const datasets = taxons.map((taxon, idx) => ({
      label: `Таксон ${idx + 1}`,
      data: taxon.route.map((pt) => pt[2]),
      borderColor: taxon.color,
      backgroundColor: taxon.color + "33",
      pointBackgroundColor: taxon.color,
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0.3,
      fill: false,
    }));

    const maxLen = Math.max(...taxons.map((t) => t.route.length));
    const labels = Array.from({ length: maxLen }, (_, i) => {
      if (i === 0) return "База (старт)";
      if (i === maxLen - 1) return "База (возврат)";
      return `Точка ${i}`;
    });

    return { labels, datasets };
  }, [taxons]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const },
      tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${formatTime(ctx.parsed.y)}` } },
    },
    scales: {
      x: { title: { display: true, text: "Точка маршрута", color: "#666" } },
      y: { title: { display: true, text: "Время от старта, с", color: "#666" }, beginAtZero: true, ticks: { callback: (value: any) => `${value} с` } },
    },
  };

  return (
    <Box sx={{ width: "100%", height: 320 }}>
      <Line data={chartData} options={options} />
    </Box>
  );
};

const TaxonTable: React.FC<{ taxons: Taxon[] }> = ({ taxons }) => (
  <TableContainer component={Paper} variant="outlined">
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: "#ffffff" }}>
          <TableCell sx={{ fontWeight: 600 }}>Таксон</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>База (x, y)</TableCell>
          <TableCell sx={{ fontWeight: 600 }} align="center">Точек съёмки</TableCell>
          <TableCell sx={{ fontWeight: 600 }} align="right">Время сессии</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {taxons.map((taxon, idx) => (
          <TableRow key={idx} hover>
            <TableCell>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: taxon.color, flexShrink: 0 }} />
                <Typography variant="body2">Таксон {idx + 1}</Typography>
              </Box>
            </TableCell>
            <TableCell>
              <Typography variant="body2" color="text.secondary">
                {`(${formatCoord(taxon.base[0])} м, ${formatCoord(taxon.base[1])} м)`}
              </Typography>
            </TableCell>
            <TableCell align="center">
              <Chip label={taxon.points.length} size="small" sx={{ bgcolor: taxon.color + "33", color: "text.primary" }} />
            </TableCell>
            <TableCell align="right">
              <Typography variant="body2" fontWeight={500}>{formatTime(taxon.time_sec)}</Typography>
            </TableCell>
          </TableRow>
        ))}
        <TableRow sx={{ bgcolor: "#ffffff" }}>
          <TableCell colSpan={2}><Typography variant="body2" fontWeight={600}>Итого</Typography></TableCell>
          <TableCell align="center"><Typography variant="body2" fontWeight={600}>{taxons.reduce((s, t) => s + t.points.length, 0)}</Typography></TableCell>
          <TableCell align="right"><Typography variant="body2" fontWeight={600}>{formatTime(taxons.reduce((s, t) => s + t.time_sec, 0))}</Typography></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </TableContainer>
);

const MethodTab: React.FC<{ data: TrajectoryData | null; methodLabel: string }> = ({ data, methodLabel }) => {
  if (!data) return <EmptyState />;

  const taxons = data.B;
  const totalPoints = taxons.reduce((s, t) => s + t.points.length, 0);
  const totalTime = taxons.reduce((s, t) => s + t.time_sec, 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1, pl: 2, pb: 2, pr: 2, width: "100%" }}>
      <Typography variant="h6" fontWeight={600}>Расширенная аналитика результатов оптимизации по {methodLabel}</Typography>

      <SummaryCards taxonsCount={taxons.length} totalPoints={totalPoints} unreachableCount={data.C.length} totalTime={totalTime} />

      {taxons.length > 0 && (
        <>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>Время маршрута по таксонам</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              Ось X — точки маршрута (0 = взлёт с базы, последняя = посадка на базу). Ось Y — накопленное время от старта таксона.
            </Typography>
            <TaxonTimeChart taxons={taxons} />
          </Card>

          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Детализация по таксонам</Typography>
            <TaxonTable taxons={taxons} />
          </Card>
        </>
      )}

      <UnreachablePoints points={data.C} />
    </Box>
  );
};

const ComparisonTab: React.FC<{ data1: TrajectoryData | null; data2: TrajectoryData | null; data3: TrajectoryData | null; storyboardsData: Storyboards | null; priorityMethod: string; setPriorityMethod: React.Dispatch<React.SetStateAction<any>>; }> = ({ data1, data2, data3, storyboardsData, priorityMethod, setPriorityMethod }) => {
  // const [selectedMethod, setSelectedMethod] = useState("method1");

const methods = [
    { id: "METHOD_1", name: "Метод 1 (НПТ)", data: data1, storyboard: storyboardsData?.optimal },
    { id: "METHOD_2", name: "Метод 2 (ВПТ)", data: data2, storyboard: storyboardsData?.optimal_big_density },
    { id: "METHOD_3", name: "Метод 3 (СПТ)", data: data3, storyboard: storyboardsData?.optimal_combi },
];

const metrics = [
    { 
      key: "time", 
      label: "Время полёта", 
      getValue: (method: typeof methods[0]) => method.data?.B.reduce((s, t) => s + t.time_sec, 0) ?? null, 
      format: formatTime 
    },
    { 
      key: "points", 
      label: "Количество кадров", 
      getValue: (method: typeof methods[0]) => method.data?.B.reduce((s, t) => s + t.points.length, 0) ?? null 
    },
    { 
      key: "infoVolume", 
      label: "Объём информации", 
      getValue: (method: typeof methods[0]) => method.storyboard?.disk_space ?? null,
      format: formatFileSize
    },
    { 
      key: "taxons", 
      label: "Количество таксонов", 
      getValue: (method: typeof methods[0]) => method.data?.B.length ?? null 
    },
    { 
      key: "unreachable", 
      label: "Недостижимые точки", 
      getValue: (method: typeof methods[0]) => method.data?.C.length ?? null 
    },
];

const getMinValue = (metric: typeof metrics[0]) => {
    const values = methods.map(m => metric.getValue(m)).filter(v => v !== null) as number[];
    return values.length ? Math.min(...values) : null;
};

const recommendedMethod = useMemo(() => {
    const scored = methods.map(method => {
        const score = metrics.reduce((acc, metric) => {
            const val = metric.getValue(method);
            const minVal = getMinValue(metric);
            return acc + (val !== null && val === minVal ? 1 : 0);
        }, 0);

        return { ...method, score };
    });

    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const ua = a.data?.C.length ?? Infinity;
        const ub = b.data?.C.length ?? Infinity;
        if (ua !== ub) return ua - ub;
        const ta = a.data?.B.reduce((s, t) => s + t.time_sec, 0) ?? Infinity;
        const tb = b.data?.B.reduce((s, t) => s + t.time_sec, 0) ?? Infinity;
        return ta - tb;
    });

    return scored[0];
}, [data1, data2, data3, storyboardsData]);

  React.useEffect(() => {
    if (recommendedMethod) {
      // setSelectedMethod(recommendedMethod.id);
      setPriorityMethod(recommendedMethod.id);
    }
  }, [recommendedMethod]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pl: 2, pt: 1, pr: 2 }}>
      <Typography variant="h6" fontWeight={600}>Сравнение количественных показателей оптимизаций</Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "action.hover" }}>
              <TableCell><strong>Название метода</strong></TableCell>
              {metrics.map(metric => <TableCell key={metric.key} align="center"><strong>{metric.label}</strong></TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {methods.map(method => (
              <TableRow key={method.id} hover>
                <TableCell><Typography variant="body2" fontWeight={500}>{method.name}</Typography></TableCell>
                {metrics.map(metric => {
                  const val = metric.getValue(method);
                  const minVal = getMinValue(metric);
                  const isMin = val !== null && minVal !== null && val === minVal;
                  return (
                    <TableCell key={metric.key} align="center" sx={{
                      backgroundColor: isMin ? "success.light" : "transparent",
                      fontWeight: isMin ? 600 : 400,
                    }}>
                      {val === null ? <Typography variant="body2" color="text.disabled">—</Typography> :
                        metric.format ? metric.format(val as number) : val}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Paper variant="outlined" sx={{ p: 2.5, borderColor: "success.main", borderWidth: 1.5, maxWidth: 700 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Typography variant="body1" color="text.secondary">Рекомендованный метод оптимизации траектории:</Typography>
          <Typography variant="body1" fontWeight={700} color="success.dark">{recommendedMethod?.name}</Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Приоритетный метод оптимизации:</Typography>
          <FormControl component="fieldset">
            <RadioGroup name="priorityMethod" value={priorityMethod} onChange={(e) => setPriorityMethod(e.target.value)}>
              {methods.map(method => (
                <FormControlLabel key={method.id} value={method.id} control={<Radio size="small" />} label={method.name} disabled={!method.data} />
              ))}
            </RadioGroup>
          </FormControl>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Ознакомьтесь с полной информацией о карте полёта, нажав на кнопку <strong>Просмотр карты</strong>.
          Данная информация будет сохранена и видна в таблице с полётными картами.
        </Typography>
      </Paper>
    </Box>
  );
};

// Основной компонент 
const CompareOptimizationMethodsStep: React.FC<CompareOptimizationMethodsStepProps> = ({
  trajectoryData,
  trajectoryData2,
  trajectoryData3,
  storyboardsData,
  priorityMethod,
  setPriorityMethod,
}) => {
  const [selectedTab, setSelectedTab] = useState(3);

  const renderTabContent = () => {
    switch (selectedTab) {
      case 0:
        return <MethodTab data={trajectoryData} methodLabel="1 методу (Низкая плотность точек)" />;
      case 1:
        return <MethodTab data={trajectoryData2} methodLabel="2 методу (Высокая плотность точек)" />;
      case 2:
        return <MethodTab data={trajectoryData3} methodLabel="3 методу (Смешанная плотность точек)" />;
      case 3:
        return <ComparisonTab data1={trajectoryData} data2={trajectoryData2} data3={trajectoryData3} storyboardsData={storyboardsData} priorityMethod={priorityMethod} setPriorityMethod={setPriorityMethod} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: "flex", height: "100%", width: "100%" }}>
      <Tabs orientation="vertical" value={selectedTab} onChange={(_, v) => setSelectedTab(v)} sx={{ borderRight: "1px solid", borderColor: "divider", minWidth: 100 }}>
        <Tab label="Метод 1" sx={{ textTransform: "none" }} />
        <Tab label="Метод 2" sx={{ textTransform: "none" }} />
        <Tab label="Метод 3" sx={{ textTransform: "none" }} />
        <Tab label="Сравнение" sx={{ textTransform: "none" }} />
      </Tabs>

      <Box sx={{ flex: 1, overflow: "auto", height: "100%" }}>
        {renderTabContent()}
      </Box>
    </Box>
  );
};

export default CompareOptimizationMethodsStep;