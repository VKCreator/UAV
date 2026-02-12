import { FC } from "react";
import { Box, Typography } from "@mui/material";

interface Frame {
  id: string;
  index: number;
  time: number;
}

interface Props {
  frames: Frame[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const StoryboardTimeline: FC<Props> = ({ frames, selectedIndex, onSelect }) => {
  return (
    <Box
      display="flex"
      gap={1}
      px={2}
      py={1}
      // overflow="auto"
      borderTop="1px solid #ddd"
      bgcolor="background.paper"
      width="100%"
      height="100%"
      maxHeight="100px"
      minHeight="100px"
      sx={{
        // width: 300,
        overflowX: "auto",
        // border: "1px solid #ccc",
      }}
    >
      {frames.map((f, i) => (
        <Box
          key={f.id}
          onClick={() => onSelect(i)}
          sx={{
            minWidth: 100,
            height: 70,
            borderRadius: 1,
            cursor: "pointer",
            border:
              i === selectedIndex ? "2px solid #1976d2" : "1px solid #ccc",
            bgcolor: "#fff",
            p: 1,
          }}
        >
          <Typography variant="caption">Кадр {i + 1}</Typography>
          <Typography variant="caption" color="text.secondary">
            {f.time} сек
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default StoryboardTimeline;
