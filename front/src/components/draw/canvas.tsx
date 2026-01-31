// ImageGridCanvas.tsx
import React, { useRef, useEffect, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface Point {
  x: number;
  y: number;
}

interface Polygon {
  points: Point[];
}

const CELL_SIZE = 100; // размер ячейки сетки в пикселях исходного изображения

const ImageGridCanvas: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<Point[]>([]);

  // Загрузка изображения
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      imageRef.current = img;
      redraw(img.width, img.height);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const redraw = (imgWidth: number, imgHeight: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Очистка
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Рисуем изображение
    ctx.drawImage(imageRef.current!, 0, 0, imgWidth, imgHeight);

    // Рисуем сетку
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;
    for (let x = 0; x <= imgWidth; x += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, imgHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= imgHeight; y += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(imgWidth, y);
      ctx.stroke();
    }

    // Рисуем точки
    ctx.fillStyle = "red";
    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Рисуем полигоны
    polygons.forEach((poly) => {
      if (poly.points.length < 2) return;
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(poly.points[0].x, poly.points[0].y);
      poly.points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.stroke();
    });

    // Рисуем текущий (незавершённый) полигон
    if (currentPolygon.length > 0) {
      ctx.strokeStyle = "green";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(currentPolygon[0].x, currentPolygon[0].y);
      currentPolygon.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      if (isDrawingPolygon) {
        // линия к курсору будет рисоваться при движении (опционально)
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  // Обновляем canvas при изменении состояния
  useEffect(() => {
    if (imageSize) {
      redraw(imageSize.width, imageSize.height);
    }
  }, [points, polygons, currentPolygon, isDrawingPolygon, imageSize]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageSize) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Ограничиваем координаты размерами изображения
    if (x < 0 || x > imageSize.width || y < 0 || y > imageSize.height) return;

    // Определяем ячейку
    const cellX = Math.floor(x / CELL_SIZE);
    const cellY = Math.floor(y / CELL_SIZE);
    console.log(
      `Клик по ячейке: [${cellX}, ${cellY}] в координатах изображения (${x.toFixed(1)}, ${y.toFixed(1)})`
    );

    // Пример: добавляем точку по клику
    setPoints((prev) => [...prev, { x, y }]);

    // Пример: режим рисования полигона
    if (isDrawingPolygon) {
      setCurrentPolygon((prev) => [...prev, { x, y }]);
    }
  };
  const startPolygonDrawing = () => {
    setIsDrawingPolygon(true);
    setCurrentPolygon([]);
  };

  const finishPolygonDrawing = () => {
    if (currentPolygon.length >= 3) {
      setPolygons((prev) => [...prev, { points: [...currentPolygon] }]);
    }
    setCurrentPolygon([]);
    setIsDrawingPolygon(false);
  };

  if (!imageSize) return <div>Загрузка изображения...</div>;

  return (
    <div style={{ position: "relative", width: "100%", height: "80vh" }}>
      {/* Панель управления */}
      <div style={{ marginBottom: "8px" }}>
        <button onClick={() => setPoints([])}>Очистить точки</button>
        <button onClick={startPolygonDrawing} disabled={isDrawingPolygon}>
          Начать полигон
        </button>
        <button onClick={finishPolygonDrawing} disabled={!isDrawingPolygon}>
          Завершить полигон
        </button>
      </div>

      {/* Zoom/Pan обёртка */}
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={5}
        smooth={true}
        limitToBounds={false} // важно: иначе нельзя будет двигать за пределы canvas
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          <canvas
            ref={canvasRef}
            width={imageSize.width}
            height={imageSize.height}
            onClick={handleCanvasClick}
            style={{
              display: "block",
              cursor: "crosshair",
              border: "1px solid #ddd",
              backgroundColor: "#f9f9f9",
            }}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};

export default ImageGridCanvas;
