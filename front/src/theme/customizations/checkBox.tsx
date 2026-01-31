// src/theme/checkboxCustomizations.ts
import { Theme, Components } from "@mui/material/styles";

export const checkboxCustomizations: Components<Theme> = {
  MuiCheckbox: {
    styleOverrides: {
      root: {
        color: "#004e9e", // цвет по умолчанию
        transition: "all 0.3s ease",

        "&:hover": {
          backgroundColor: "rgba(0, 78, 158, 0.08)",
        },

        "&.Mui-checked": {
          color: "#004e9e", // цвет галочки
          "&:hover": {
            backgroundColor: "rgba(0, 78, 158, 0.12)",
          },
        },

        "&.Mui-disabled": {
          color: "#b0bec5", // серый для отключённого состояния
        },

        "&.Mui-indeterminate": {
          color: "#004e9e", // цвет для состояния "частично выбран"
        },
      },
    },
  },
};
