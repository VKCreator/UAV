// src/theme/radioCustomizations.ts
import { Theme, Components } from "@mui/material/styles";

export const radioCustomizations: Components<Theme> = {
  MuiRadio: {
    styleOverrides: {
      root: {
        color: "#004e9e", // цвет по умолчанию
        transition: "all 0.3s ease",

        "&:hover": {
          backgroundColor: "rgba(0, 78, 158, 0.08)",
        },

        "&.Mui-checked": {
          color: "#004e9e", // цвет выбранного radio

          "&:hover": {
            backgroundColor: "rgba(0, 78, 158, 0.12)",
          },
        },

        "&.Mui-disabled": {
          color: "#b0bec5", // отключённое состояние
        },
      },
    },
  },
};
