import { FC } from "react";
import { Tooltip, IconButton, SxProps, Theme } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

interface HelpIconTooltipProps {
  title: string;
  size?: "small" | "medium" | "large";
  sx?: SxProps<Theme>;
  enterDelay?: number;
}

export const HelpIconTooltip: FC<HelpIconTooltipProps> = ({
  title,
  size = "small",
  sx,
  enterDelay = 400,
}) => {
  return (
    <Tooltip title={title} arrow enterDelay={enterDelay}>
      <IconButton
        size={size}
        component="span"
        sx={{ m: 0, p: 0, ml: 1, ...sx }}
      >
        <HelpOutlineIcon fontSize={size} />
      </IconButton>
    </Tooltip>
  );
};
