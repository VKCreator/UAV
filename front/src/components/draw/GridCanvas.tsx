import React, { useRef, useEffect, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const CELL_SIZE = 100;

const ImageWithSvgOverlay: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [polygons, setPolygons] = useState<
    { id: number; points: [number, number][] }[]
  >([]);

  // Храним загруженное изображение
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Загружаем изображение
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      imageRef.current = img;

      drawImageAndGrid(); // попробуем нарисовать
    };

    img.onerror = () => {
      setLoadError("Не удалось загрузить изображение");
    };

    img.src = imageUrl;
  }, [imageUrl]);

  // Рисуем, когда canvas появляется
  useEffect(() => {
    if (imageSize) {
      drawImageAndGrid();
    }
  }, [imageSize]); // срабатывает после монтирования

  // Функция отрисовки
  const drawImageAndGrid = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageSize) return;

    canvas.width = imageSize.width;
    canvas.height = imageSize.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    // Сетка
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    for (let x = 0; x <= imageSize.width; x += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, imageSize.height);
      ctx.stroke();
    }
    for (let y = 0; y <= imageSize.height; y += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(imageSize.width, y);
      ctx.stroke();
    }
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!imageSize) return;

    const pt = new DOMPoint(e.clientX, e.clientY);
    const svg = e.currentTarget;
    const screenCTM = svg.getScreenCTM();
    if (!screenCTM) return;

    const transformedPt = pt.matrixTransform(screenCTM.inverse());
    const x = transformedPt.x;
    const y = transformedPt.y;

    if (x >= 0 && x <= imageSize.width && y >= 0 && y <= imageSize.height) {
      setPoints((prev) => [...prev, [x, y]]);
    }
  };

  if (loadError) {
    return <div style={{ color: "red", padding: "20px" }}>{loadError}</div>;
  }

  if (!imageSize) {
    return <div>Загрузка изображения...</div>;
  }

  return (
    <div style={{ width: "100%", height: "80vh", position: "relative" }}>
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={5}
        limitToBounds={false}
        smooth={true}
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          <>
            <canvas
              ref={canvasRef}
              width={imageSize.width}
              height={imageSize.height}
              style={{ display: "block" }}
            />
            <svg
              width={imageSize.width}
              height={imageSize.height}
              onClick={handleSvgClick}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                pointerEvents: "none",
              }}
            >
              {points.map(([x, y], i) => (
                <circle
                  key={`point-${i}`}
                  cx={x}
                  cy={y}
                  r="5"
                  fill="red"
                  pointerEvents="auto"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
              ))}
              {polygons.map((poly) => (
                <polygon
                  key={poly.id}
                  points={poly.points.map(([x, y]) => `${x},${y}`).join(" ")}
                  fill="none"
                  stroke="blue"
                  strokeWidth="2"
                  pointerEvents="auto"
                />
              ))}
            </svg>
          </>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};

export default ImageWithSvgOverlay;
