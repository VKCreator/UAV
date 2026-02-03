import { IconButton, Tooltip, SxProps } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

interface DeleteButtonProps {
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string; // текст тултипа
  sx?: SxProps;     // можно добавить кастомный стиль сверху
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({
  onClick,
  disabled = false,
  tooltip = "Очистить",
  sx = {},
}) => {
  const defaultSx: SxProps = {
    "&:hover": {
      backgroundColor: "rgba(255,0,0,0.1)",
    },
    ...sx,
  };

  return (
    <Tooltip title={disabled ? "" : tooltip} arrow>
      <span>
        <IconButton
          size="small"
          // edge="end"
          color="error"
          onClick={onClick}
          disabled={disabled}
          sx={defaultSx}
        >
          <DeleteIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
};
