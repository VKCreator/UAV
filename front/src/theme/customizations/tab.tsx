// src/theme/tabCustomizations.ts
import { Components } from "@mui/material/styles";

export const tabCustomizations: Components = {
  MuiTabs: {
    styleOverrides: {
      root: {
        textTransform: 'none', // Убираем капслок
      },
      indicator: {
        backgroundColor: '#004e9e', // Цвет индикатора (подсветка активной вкладки)
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none', // Убираем капслок для текста вкладок
        fontWeight: 600, // Устанавливаем вес шрифта
        padding: '10px 15px', // Устанавливаем отступы
        transition: 'all 0.3s ease',

        "&.Mui-selected": {
        //   backgroundColor: "rgba(0, 78, 158, 0.08)", // Подсветка активной вкладки
          color: "#004e9e", // Цвет текста активной вкладки
        },

        "&:hover": {
          backgroundColor: "rgba(0, 78, 158, 0.04)", // Цвет при наведении
        },
      },
    },
  },
};
