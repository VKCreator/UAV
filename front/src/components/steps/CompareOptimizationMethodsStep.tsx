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

// import type { Taxon } from "../../types/optTrajectory.types";

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

/** Точка маршрута: [x, y, время_от_старта_сек] */
type RoutePoint = [number, number, number];

interface Taxon {
  base: [number, number];
  points: RoutePoint[];
  time_sec: number;
  route: RoutePoint[];
}

interface TrajectoryData {
  N_k: number;
  B: Taxon[];
  /** Недостижимые точки: [x, y] */
  C: [number, number][];
}

interface CompareOptimizationMethodsStepProps {
  trajectoryData: TrajectoryData | null;
}

// ─── Утилиты ──────────────────────────────────────────────────────────────────

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m} мин ${s} с` : `${s} с`;
};

const formatCoord = (v: number): string => v.toFixed(2);

// ─── Подкомпонент: график времени маршрута по таксонам ────────────────────────

const TaxonTimeChart: React.FC<{ taxons: Taxon[] }> = ({ taxons }) => {
  const chartData = useMemo(() => {
    // Для каждого таксона берём route: [база_старт, ...точки..., база_возврат]
    // Ось X — порядковый номер точки в маршруте (0 = старт с базы)
    // Ось Y — время в секундах (3-й элемент каждой RoutePoint)

    const datasets = taxons.map((taxon, idx) => {
      const color = taxon.color;

      const data = taxon.route.map((pt) => pt[2]); // берём только время

      return {
        label: `Таксон ${idx + 1}`,
        data,
        borderColor: color,
        backgroundColor: color + "33",
        pointBackgroundColor: color,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.3,
        fill: false,
      };
    });

    // Максимальное количество точек среди всех таксонов
    const maxLen = Math.max(...taxons.map((t) => t.route.length));

    // Подписи оси X: 0 = "База (старт)", последний = "База (возврат)", остальные = номер точки
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
      legend: {
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) =>
            `${ctx.dataset.label}: ${formatTime(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Точка маршрута",
          color: "#666",
        },
      },
      y: {
        title: {
          display: true,
          text: "Время от старта, с",
          color: "#666",
        },
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `${value} с`,
        },
      },
    },
  };

  return (
    <Box sx={{ width: "100%", height: 320 }}>
      <Line data={chartData} options={options} />
    </Box>
  );
};

// ─── Подкомпонент: таблица таксонов ──────────────────────────────────────────

const TaxonTable: React.FC<{ taxons: Taxon[] }> = ({ taxons }) => (
  <TableContainer component={Paper} variant="outlined">
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: "#ffffff" }}>
          <TableCell sx={{ fontWeight: 600 }}>Таксон</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>База (x, y)</TableCell>
          <TableCell sx={{ fontWeight: 600 }} align="center">
            Точек съёмки
          </TableCell>
          <TableCell sx={{ fontWeight: 600 }} align="right">
            Время сессии
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {taxons.map((taxon, idx) => {
          const color = taxon.color;
          return (
            <TableRow key={idx} hover>
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: color,
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="body2">Таксон {idx + 1}</Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {`(${formatCoord(taxon.base[0])} м, ${formatCoord(taxon.base[1])} м)`}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={taxon.points.length}
                  size="small"
                  sx={{ bgcolor: color + "33", color: "text.primary" }}
                />
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight={500}>
                  {formatTime(taxon.time_sec)}
                </Typography>
              </TableCell>
            </TableRow>
          );
        })}

        {/* Итого */}
        <TableRow sx={{ bgcolor: "#ffffff" }}>
          <TableCell colSpan={2}>
            <Typography variant="body2" fontWeight={600}>
              Итого
            </Typography>
          </TableCell>
          <TableCell align="center">
            <Typography variant="body2" fontWeight={600}>
              {taxons.reduce((s, t) => s + t.points.length, 0)}
            </Typography>
          </TableCell>
          <TableCell align="right">
            <Typography variant="body2" fontWeight={600}>
              {formatTime(taxons.reduce((s, t) => s + t.time_sec, 0))}
            </Typography>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </TableContainer>
);

// ─── Подкомпонент: недостижимые точки ────────────────────────────────────────

const UnreachablePoints: React.FC<{ points: [number, number][] }> = ({
  points,
}) => {
  if (points.length === 0) return null;

  return (
    <Alert
      severity="warning"
      sx={{ mt: 2 }}
      icon={
        // SVG недостижимой точки из легенды
        <svg width={20} height={20} style={{ flexShrink: 0, marginTop: 2 }}>
          <circle
            cx={10}
            cy={10}
            r={8}
            fill="rgba(255,107,53,0.15)"
            stroke="#FF6B35"
            strokeWidth={1.5}
          />
          <line x1={6} y1={6} x2={14} y2={14} stroke="#FF6B35" strokeWidth={2} />
          <line x1={14} y1={6} x2={6} y2={14} stroke="#FF6B35" strokeWidth={2} />
        </svg>
      }
    >
      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
        Недостижимые точки: {points.length} шт.
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
        Квадрокоптер не может посетить эти точки в рамках ограничений заряда батареи.
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
        {points.map((pt, i) => (
          <Chip
            key={i}
            size="small"
            label={`(${formatCoord(pt[0])} м, ${formatCoord(pt[1])} м)`}
            sx={{
              bgcolor: "rgba(255,107,53,0.1)",
              border: "1px solid #FF6B35",
              color: "text.primary",
              fontSize: "0.7rem",
            }}
          />
        ))}
      </Box>
    </Alert>
  );
};

// ─── Вкладка метода 1 ─────────────────────────────────────────────────────────

const Method1Tab: React.FC<{ data: TrajectoryData }> = ({ data }) => {
  const { B: taxons, C: unreachable } = data;

  const totalPoints = taxons.reduce((s, t) => s + t.points.length, 0);
  const totalTime = taxons.reduce((s, t) => s + t.time_sec, 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1, pl: 2, pb: 2, pr: 2, width: "100%" }}>
    <Typography variant="h6" fontWeight={600}>
      Расширенная аналитика результатов оптимизации по 1 методу
    </Typography>
      {/* Сводка */}
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Card
          variant="outlined"
          sx={{ p: 2, flex: 1, minWidth: 140, textAlign: "center" }}
        >
          <Typography variant="h4" fontWeight={700} sx={{ color: "#014488" }}>
            {taxons.length}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            таксонов
          </Typography>
        </Card>
        <Card
          variant="outlined"
          sx={{ p: 2, flex: 1, minWidth: 140, textAlign: "center" }}
        >
          <Typography variant="h4" fontWeight={700} sx={{ color: "#014488" }}>
            {totalPoints}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            точек охвачено
          </Typography>
        </Card>
        <Card
          variant="outlined"
          sx={{ p: 2, flex: 1, minWidth: 140, textAlign: "center" }}
        >
          <Typography variant="h4" fontWeight={700} sx={{ color: "#014488" }}>
            {unreachable.length}
          </Typography>
          <Typography
            variant="caption"
            color={unreachable.length > 0 ? "warning.main" : "text.secondary"}
          >
            недостижимых
          </Typography>
        </Card>
        <Card
          variant="outlined"
          sx={{ p: 2, flex: 1, minWidth: 140, textAlign: "center" }}
        >
          <Typography variant="h4" fontWeight={700} sx={{ color: "#014488" }}>
            {formatTime(totalTime)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            общее время
          </Typography>
        </Card>
      </Box>

      {/* График */}
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
          Время маршрута по таксонам
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Ось X — точки маршрута (0 = взлёт с базы, последняя = посадка на базу).
          Ось Y — накопленное время от старта таксона.
        </Typography>
        <TaxonTimeChart taxons={taxons} />
      </Card>

      {/* Таблица */}
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
          Детализация по таксонам
        </Typography>
        <TaxonTable taxons={taxons} />
      </Card>

      {/* Недостижимые точки */}
      <UnreachablePoints points={unreachable} />
    </Box>
  );
};

// ─── Основной компонент ───────────────────────────────────────────────────────

const CompareOptimizationMethodsStep: React.FC<
  CompareOptimizationMethodsStepProps
> = ({ trajectoryData }) => {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <Box sx={{ display: "flex", height: "100%", width: "100%" }}>
      <Tabs
        orientation="vertical"
        value={selectedTab}
        onChange={(_, v) => setSelectedTab(v)}
        sx={{       borderRight: "1px solid",
      borderColor: "divider",
      minWidth: 100, }}
      >
        <Tab label="Метод 1" sx={{ textTransform: "none" }} />
        <Tab label="Метод 2" sx={{ textTransform: "none" }} />
        <Tab label="Метод 3" sx={{ textTransform: "none" }} />
        <Tab label="Сравнение" sx={{ textTransform: "none" }} />
      </Tabs>
    <Box sx={{ 
        flex: 1,           
        overflow: "auto",
        height: "100%",
      }}>
      {selectedTab === 0 && (
        <>
          {trajectoryData ? (
            <Method1Tab data={trajectoryData} />
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 1,
                color: "text.secondary",
              }}
            >
              <Typography variant="body1">
                Результаты оптимизации отсутствуют
              </Typography>
              <Typography variant="caption">
                Запустите оптимизацию на шаге 3, чтобы увидеть результаты
              </Typography>
            </Paper>
          )}
        </>
      )}
      {selectedTab === 3 && (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pl: 2, pt: 1, pr: 2 }}>
    <Typography variant="h6" fontWeight={600}>
      Сравнение количественных показателей оптимизаций
    </Typography>

    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: "action.hover" }}>
            <TableCell><strong>Название метода</strong></TableCell>
            <TableCell align="center"><strong>Время полёта</strong></TableCell>
            <TableCell align="center"><strong>Количество кадров</strong></TableCell>
            <TableCell align="center"><strong>Объём информации</strong></TableCell>
            <TableCell align="center"><strong>Количество таксонов</strong></TableCell>
            <TableCell align="center"><strong>Недостижимые точки</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(() => {
            const methods = [
              {
                name: "Метод 1 (МКТ)",
                flightTime: trajectoryData?.method1?.flightTime ?? null,
                frames: trajectoryData?.method1?.frames ?? null,
                dataVolume: trajectoryData?.method1?.dataVolume ?? null,
                taxons: trajectoryData?.method1?.taxons ?? null,
                unreachable: trajectoryData?.method1?.unreachable ?? null,
              },
              {
                name: "Метод 2 (БКТ)",
                flightTime: trajectoryData?.method2?.flightTime ?? null,
                frames: trajectoryData?.method2?.frames ?? null,
                dataVolume: trajectoryData?.method2?.dataVolume ?? null,
                taxons: trajectoryData?.method2?.taxons ?? null,
                unreachable: trajectoryData?.method2?.unreachable ?? null,
              },
              {
                name: "Метод 3 (Комби)",
                flightTime: trajectoryData?.method3?.flightTime ?? null,
                frames: trajectoryData?.method3?.frames ?? null,
                dataVolume: trajectoryData?.method3?.dataVolume ?? null,
                taxons: trajectoryData?.method3?.taxons ?? null,
                unreachable: trajectoryData?.method3?.unreachable ?? null,
              },
            ];

            const keys: (keyof typeof methods[0])[] = [
              "flightTime", "frames", "dataVolume", "taxons", "unreachable",
            ];

            const mins: Record<string, number | null> = {};
            keys.forEach((key) => {
              const vals = methods
                .map((m) => m[key] as number | null)
                .filter((v): v is number => v !== null);
              mins[key] = vals.length > 0 ? Math.min(...vals) : null;
            });

            const formatVal = (v: number | null) =>
              v === null ? <Typography variant="body2" color="text.disabled">—</Typography> : v;

            return methods.map((method) => (
              <TableRow key={method.name} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {method.name}
                  </Typography>
                </TableCell>
                {keys.map((key) => {
                  const val = method[key] as number | null;
                  const isMin = val !== null && mins[key] !== null && val === mins[key];
                  return (
                    <TableCell
                      key={key}
                      align="center"
                      sx={{
                        backgroundColor: isMin ? "success.light" : "transparent",
                        color: isMin ? "success.contrastText" : "inherit",
                        fontWeight: isMin ? 600 : 400,
                        transition: "background-color 0.2s",
                      }}
                    >
                      {formatVal(val)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ));
          })()}
        </TableBody>
      </Table>
    </TableContainer>

    {(() => {
      // Recommendation logic:
      // Score each method: +1 for each column where it has the minimum value.
      // Tiebreak: prefer fewer unreachable points, then shorter flight time.
      const methods = [
        {
          name: "Метод 1 (МКТ)",
          flightTime: trajectoryData?.method1?.flightTime ?? null,
          frames: trajectoryData?.method1?.frames ?? null,
          dataVolume: trajectoryData?.method1?.dataVolume ?? null,
          taxons: trajectoryData?.method1?.taxons ?? null,
          unreachable: trajectoryData?.method1?.unreachable ?? null,
        },
        {
          name: "Метод 2 (БКТ)",
          flightTime: trajectoryData?.method2?.flightTime ?? null,
          frames: trajectoryData?.method2?.frames ?? null,
          dataVolume: trajectoryData?.method2?.dataVolume ?? null,
          taxons: trajectoryData?.method2?.taxons ?? null,
          unreachable: trajectoryData?.method2?.unreachable ?? null,
        },
        {
          name: "Метод 3 (Комби)",
          flightTime: trajectoryData?.method3?.flightTime ?? null,
          frames: trajectoryData?.method3?.frames ?? null,
          dataVolume: trajectoryData?.method3?.dataVolume ?? null,
          taxons: trajectoryData?.method3?.taxons ?? null,
          unreachable: trajectoryData?.method3?.unreachable ?? null,
        },
      ];

      const keys: (keyof typeof methods[0])[] = [
        "flightTime", "frames", "dataVolume", "taxons", "unreachable",
      ];

      const mins: Record<string, number | null> = {};
      keys.forEach((key) => {
        const vals = methods
          .map((m) => m[key] as number | null)
          .filter((v): v is number => v !== null);
        mins[key] = vals.length > 0 ? Math.min(...vals) : null;
      });

      const scored = methods.map((method) => {
        const score = keys.reduce((acc, key) => {
          const val = method[key] as number | null;
          return acc + (val !== null && val === mins[key] ? 1 : 0);
        }, 0);
        return { ...method, score };
      });

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const ua = a.unreachable ?? Infinity;
        const ub = b.unreachable ?? Infinity;
        if (ua !== ub) return ua - ub;
        const fa = a.flightTime ?? Infinity;
        const fb = b.flightTime ?? Infinity;
        return fa - fb;
      });

      const recommended = scored[0];

      return (
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            borderColor: "success.main",
            borderWidth: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body1" color="text.secondary">
              Рекомендованный метод оптимизации траектории:
            </Typography>
            <Typography variant="body1" fontWeight={700} color="success.dark">
              {recommended.name}
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ mt: 0, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
    Приоритетный метод оптимизации:
  </Typography>
  
  <FormControl component="fieldset">
    <RadioGroup
      name="priorityMethod"
      defaultValue="method1"
      onChange={(e) => console.log('Выбран метод:', e.target.value)}
    >
      <FormControlLabel 
        value="method1" 
        control={<Radio size="small" />} 
        label="Метод 1" 
      />
      <FormControlLabel 
        value="method2" 
        control={<Radio size="small" />} 
        label="Метод 2" 
      />
      <FormControlLabel 
        value="method3" 
        control={<Radio size="small" />} 
        label="Метод 3" 
      />
    </RadioGroup>
  </FormControl>
</Box>
            <Typography variant="body2" color="text.secondary">
            Ознакомьтесь с полной информацией о карте полёта, нажав на кнопку{" "}
            <strong>Просмотр карты</strong>. Данная информация будет сохранена,
            и вы сможете её увидеть при просмотре подробностей в таблице с полётными картами.
          </Typography>
        </Paper>
      );
    })()}
  </Box>
)}
</Box>
    </Box>
  );
};

export default CompareOptimizationMethodsStep;
