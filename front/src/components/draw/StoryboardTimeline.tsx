import { FC, useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import ZoomInIcon from "@mui/icons-material/ZoomIn";

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
}

const StoryboardTimeline: FC<Props> = ({ frames }) => {
  const [open, setOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  const handleDoubleClick = (url: string) => {
    setCurrentUrl(url);
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  return (
    <>
      <Box width="100%">
        {/* ---------------- Заголовок ---------------- */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          px={2}
          py={1}
          borderTop="1px solid #ddd"
          bgcolor="background.paper"
        >
          {frames?.length > 0 && (
            <Typography variant="subtitle2" fontWeight={600}>
              Коллекция кадров ({frames?.length ?? 0} шт.)
            </Typography>
          )}
        </Box>

        {/* ---------------- Список кадров ---------------- */}
        <Box
          display="flex"
          gap={1}
          px={2}
          py={1}
          bgcolor="background.paper"
          width="100%"
          maxHeight="150px"
          sx={{
            overflowX: "auto",
            // overflowY: "auto",
          }}
        >
          {frames && frames.length > 0 ? (
            frames.map((f, i) => (
              <Box
                key={`frame-${i}`}
                display="flex"
                flexDirection="column"
                alignItems="center"
                // onClick={() => onSelect(i)}
                onClick={() => handleDoubleClick(f)}
                onDoubleClick={() => handleDoubleClick(f)}
                sx={{ cursor: "pointer" }}
              >
                <Box
                  sx={{
                    position: "relative",
                    minWidth: 100,
                    height: 90,
                    borderRadius: 1,
                    overflow: "hidden",
                    border: "1px solid #ccc",
                    // border:
                    //   i === selectedIndex
                    //     ? "2px solid #1976d2"
                    //     : "1px solid #ccc",

                    "&:hover .overlay": {
                      opacity: 1,
                    },
                  }}
                >
                  <img
                    src={f}
                    alt={`Кадр ${i + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />

                  {/* Overlay */}
                  <Box
                    className="overlay"
                    sx={{
                      position: "absolute",
                      inset: 0,
                      backgroundColor: "rgba(0,0,0,0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0,
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    <ZoomInIcon sx={{ color: "#fff", fontSize: 28 }} />
                  </Box>
                </Box>

                <Typography variant="caption" mt={0.5}>
                  {`Кадр ${i + 1}`}
                </Typography>
              </Box>
            ))
          ) : (
            <Box
              width="100%"
              display="flex"
              alignItems="center"
              justifyContent="center"
              py={3}
            >
              <Typography variant="body2" color="text.secondary" align="center">
                Выбранный тип раскадровки не применён. <br />
                Нажмите кнопку <strong>«Применить»</strong> для отображения
                коллекции кадров.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Диалоговое окно для просмотра кадра с Konva */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
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
  const [scale, setScale] = useState(1);
  const stageRef = useRef<any>(null);

  // Устанавливаем масштаб и центрируем изображение при загрузке
  useEffect(() => {
    if (!image || !stageRef.current) return;

    const containerWidth = 600;
    const containerHeight = 500;
    const scaleX = containerWidth / image.width;
    const scaleY = containerHeight / image.height;
    const fitScale = Math.min(scaleX * 0.9, scaleY * 0.9);

    setScale(fitScale);
    setPosition({
      x: (containerWidth - image.width * fitScale) / 2,
      y: (containerHeight - image.height * fitScale) / 2,
    });
  }, [image]);

  if (!image) return null;

  // Обработка зума через колесо мыши
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? 1 / scaleBy : scaleBy;
    const newScale = oldScale * direction;

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    stage.batchDraw();
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center">
      <Box width={600} height={500} boxShadow={3} bgcolor="#fff" m={3}>
        <Stage
          width={600}
          height={500}
          ref={stageRef}
          draggable
          onWheel={handleWheel}
        >
          <Layer>
            <KonvaImage
              image={image}
              x={position.x}
              y={position.y}
              scale={{ x: scale, y: scale }}
              draggable
              onMouseEnter={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = "grab";
              }}
              onMouseLeave={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = "default";
              }}
              onDragStart={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = "grabbing";
              }}
              onDragEnd={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = "grab";
                setPosition({ x: e.target.x(), y: e.target.y() });
              }}
            />
          </Layer>
        </Stage>
      </Box>
    </Box>
  );
};

export default StoryboardTimeline;
