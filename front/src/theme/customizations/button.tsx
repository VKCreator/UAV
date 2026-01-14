// src/theme/buttonCustomizations.ts
import { alpha, Theme } from "@mui/material/styles";
import { Components } from "@mui/material/styles";

export const buttonCustomizations: Components<Theme> = {
  MuiButton: {
    styleOverrides: {
      // Стиль для всех кнопок (основной)
      root: {
        textTransform: "none",
        fontWeight: 600,
        borderRadius: 8, // Круглые углы
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)", // Лёгкая тень
        transition: "all 0.3s ease",
      },

      // Стиль для variant="contained"
      contained: {
        backgroundColor: "#004e9e",
        color: "white", // Белый текст
        "&:hover": {
          backgroundColor: "#014488ff", // Темнее при наведении
          boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.15)",
        },
        "&:active": {
          backgroundColor: "#013c76ff", // Ещё темнее при нажатии
        },
        "&:disabled": {
          backgroundColor: "#b0bec5", // Серый при отключении
          color: "rgba(255, 255, 255, 0.7)",
        },
      },

      // Стиль для variant="outlined"
      outlined: {
        borderColor: "#004e9e",
        color: "#004e9e",
        "&:hover": {
          backgroundColor: "rgba(76, 134, 175, 0.04)",
          borderColor: "#004e9e",
        },
        "&:active": {
          backgroundColor: "rgba(76, 134, 175, 0.08)",
        },
      },

      // Стиль для variant="text"
      text: {
        color: "#004e9e",
        "&:hover": {
          backgroundColor: "rgba(76, 134, 175, 0.04)",
        },
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        // Общие стили для всех IconButton
        borderRadius: "50%", // Круглая форма
        padding: "8px", // Минимальный отступ вокруг иконки
        transition: "all 0.2s ease",
        // color: "#ffffffff", // Цвет иконки по умолчанию
        "&:disabled": {
          color: "#b0bec5", // Серый цвет для отключённых
          backgroundColor: "transparent", // Не меняем фон — сохраняем прозрачность
        },
        // Опционально: убираем лишние границы
        border: "none",
      },

      // Стили для кнопок с цветом "primary" (если используете color="primary")
      colorPrimary: {
        color: "#004e9e",
        "&:hover": {
          backgroundColor: "rgba(0, 78, 158, 0.08)",
        },
        "&:active": {
          backgroundColor: "rgba(0, 78, 158, 0.12)",
        },
      },

      colorSecondary: {
        color: "#ffffffff",
        "&:hover": {
          backgroundColor: "rgba(0, 78, 158, 0.08)",
        },
        "&:active": {
          backgroundColor: "rgba(0, 78, 158, 0.12)",
        },
      },

      // Стили для кнопок с цветом "inherit" (наследует цвет текста)
      colorInherit: {
        "&:hover": {
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        },
      },
    },
  },

  MuiDataGrid: {
    styleOverrides: {
      toolbarContainer: {
        MuiIconButton: {
          color: "#000000 !important"
        }
      }
    }
  }
};
