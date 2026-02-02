import React, { useState } from "react";
import { Tab, Tabs, Box, Typography, Paper } from "@mui/material";
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

// Регистрируем необходимые компоненты для Chart.js
ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
);

const CompareOptimizationMethodsStep: React.FC = () => {
  // Состояния для вкладок
  const [selectedTab, setSelectedTab] = useState(0);

  // Данные для графика (мнимые)
  const chartData = {
    labels: Array.from({ length: 10 }, (_, i) => i + 1), // Количество точек по оси X
    datasets: [
      {
        label: "Метод 1",
        data: Array.from({ length: 10 }, () => Math.random() * 10), // Время полета для метода 1
        fill: false,
        borderColor: "rgba(75,192,192,1)",
        tension: 0.1,
      },
      {
        label: "Метод 2",
        data: Array.from({ length: 10 }, () => Math.random() * 10), // Время полета для метода 2
        fill: false,
        borderColor: "rgba(153,102,255,1)",
        tension: 0.1,
      },
    ],
  };

  // Обработчик смены вкладки
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Горизонтальные вкладки */}
      <Tabs
        value={selectedTab}
        onChange={handleTabChange}
        sx={{ marginBottom: 2 }}
      >
        <Tab label="Метод 1" sx={{ textTransform: "none" }} />
        <Tab label="Метод 2" sx={{ textTransform: "none" }} />
        <Tab label="Сравнение" sx={{ textTransform: "none" }} />
      </Tabs>

      {/* Описание в зависимости от выбранной вкладки */}
      <Paper sx={{ padding: 2, marginBottom: 2 }}>
        <Typography variant="h6">
          {selectedTab === 0 && "Описание метода 1"}
          {selectedTab === 1 && "Описание метода 2"}
          {selectedTab === 2 && "Описание сравнения двух методов"}
        </Typography>
        <Typography variant="body1" sx={{ marginTop: 2 }}>
          {selectedTab === 0 && "описание метода 1."}
          {selectedTab === 1 && "описание метода 2. "}
          {selectedTab === 2 && "описание сравнения двух методов."}
        </Typography>
      </Paper>

      {/* График */}
      <Paper sx={{ padding: 2 }}>
        <Box sx={{ width: "600px", height: "300px" }}>
          <Line
            data={chartData}
            options={{ responsive: true, maintainAspectRatio: false }}
          />
        </Box>

        <Box sx={{ marginTop: 2 }}>
          <Typography variant="body1">
            {/* Комментарий о графике */}
            График показывает сравнение времени полета для двух методов. Ось X -
            количество точек, ось Y - время полета.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default CompareOptimizationMethodsStep;
