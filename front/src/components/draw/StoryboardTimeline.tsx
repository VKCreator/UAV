import { FC, useState, useEffect } from "react";
import { Box, Typography, Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Stage, Layer, Image as KonvaImage } from "react-konva";

// хук для конвертации HTMLImageElement в Konva Image
const useImage = (url: string): [HTMLImageElement | null] => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const image = new Image();
    image.src = url;
    image.onload = () => setImg(image);
  }, [url]);
  return [img];
};

interface Props {
  frames: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const StoryboardTimeline: FC<Props> = ({ frames, selectedIndex, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  const handleDoubleClick = (url: string) => {
    setCurrentUrl(url);
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  return (
    <>
      <Box
        display="flex"
        gap={1}
        px={2}
        py={1}
        borderTop="1px solid #ddd"
        bgcolor="background.paper"
        width="100%"
        maxHeight="150px"
        sx={{
          overflowX: "auto",
          overflowY: "auto",
        }}
      >
        {frames.map((f, i) => (
          <Box
            key={`frame-${i}`}
            display="flex"
            flexDirection="column"
            alignItems="center"
            onClick={() => onSelect(i)}
            onDoubleClick={() => handleDoubleClick(f)}
            sx={{ cursor: "pointer" }}
          >
            <img
              src={f}
              alt={`Кадр ${i + 1}`}
              style={{
                minWidth: 100,
                height: 90,
                borderRadius: 4,
                border:
                  i === selectedIndex ? "2px solid #1976d2" : "1px solid #ccc",
                objectFit: "cover",
              }}
            />
            <Typography variant="caption" mt={0.5}>
              {`Кадр ${i + 1}`}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Диалоговое окно для просмотра кадра с Konva */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Просмотр кадра
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {currentUrl && <KonvaViewer url={currentUrl} />}
        </DialogContent>
      </Dialog>
    </>
  );
};

// отдельный компонент для Konva Stage
const KonvaViewer: FC<{ url: string }> = ({ url }) => {
  const [image] = useImage(url);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  if (!image) return null;

  return (
    <Stage width={image.width} height={image.height} style={{ border: "1px solid #ccc" }}>
      <Layer>
        <KonvaImage
          image={image}
          x={position.x}
          y={position.y}
          draggable
          onDragEnd={(e) => setPosition({ x: e.target.x(), y: e.target.y() })}
        />
      </Layer>
    </Stage>
  );
};

export default StoryboardTimeline;
