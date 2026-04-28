import { useParams, useNavigate, useSearchParams } from "react-router";
import {
  Box,
  Tooltip,
  CircularProgress,
  Typography,
  Button,
} from "@mui/material";
import { Fab, Zoom } from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useRef, useEffect, useState } from "react";
import Konva from "konva";

import FlightSchemaPage from "./FlightSchemaPage";
import type { DroneParams, Weather } from "../types/uav.types";
import type { Storyboards } from "../types/storyboards.types";
import type { Point } from "../types/scene.types";

import { useDocumentTitle } from "../hooks/useDocumentTitle/useDocumentTitle";
import { API_BASE_URL } from "../api/config";
import { schemasApi } from "../api/schemas.api";

//  Константы
const FALLBACK_DRONE_PARAMS: DroneParams = {
  selectedDroneId: undefined,
  frameHeightBase: 0,
  frameWidthBase: 0,
  frameHeightPlanned: 0,
  frameWidthPlanned: 0,
  distance: 75,
  plannedDistance: 15,
  considerObstacles: true,
  uavCameraParams: {
    fov: 77,
    resolutionWidth: 5472,
    resolutionHeight: 3648,
    useFromReference: true,
  },
  speed: 5,
  batteryTime: 30,
  hoverTime: 5,
  windResistance: 15,
  model: "unknown",
};

const FALLBACK_STORYBOARDS: Storyboards = {
  point: {
    count_frames: null,
    disk_space: null,
    total_flight_time: null,
    applied: false,
  },
  recommended: {
    count_frames: null,
    disk_space: null,
    total_flight_time: null,
    applied: false,
  },
  optimal: {
    count_frames: null,
    disk_space: null,
    total_flight_time: null,
    applied: false,
  },
  optimal_big_density: {
    count_frames: null,
    disk_space: null,
    total_flight_time: null,
    applied: false,
  },
  optimal_combi: {
    count_frames: null,
    disk_space: null,
    total_flight_time: null,
    applied: false,
  }
};

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function calcFrameSize(distance: number, fovDeg: number): number {
  const fovRad = (fovDeg * Math.PI) / 180;
  return 2 * distance * Math.tan(fovRad / 2);
}

/** Вспомогательная функция для извлечения чисел из новых полей бэкенда */
const getNum = (val: any, fallback: number = 0): number => {
  if (val && typeof val === "object" && "parsedValue" in val) {
    return val.parsedValue;
  }
  if (typeof val === "number") return val;
  return fallback;
};

/** Точная копия cropFrameKonva из StoryboardEditor */
function cropFrameKonva(
  image: HTMLImageElement,
  centerX: number,
  centerY: number,
  frameWidth: number,
  frameHeight: number,
): Promise<Blob> {
  return new Promise((resolve) => {
    const stage = new Konva.Stage({
      width: frameWidth,
      height: frameHeight,
      container: document.createElement("div"),
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    const konvaImage = new Konva.Image({
      image,
      x: -centerX + frameWidth / 2,
      y: -centerY + frameHeight / 2,
    });

    layer.add(konvaImage);
    layer.draw();

    stage.toCanvas().toBlob(
      (blob: Blob | null) => {
        if (blob) resolve(blob);
      },
      "image/jpeg",
      1,
    );
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Компонент

export default function TrajectoryDetails() {
  const navigate = useNavigate();
  useDocumentTitle("Просмотр карты | SkyPath Service");
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();

  const page = searchParams.get("page");
  const pageSize = searchParams.get("pageSize");

  const [schemaData, setSchemaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [framesUrlsPointBased, setFramesUrlsPointBased] = useState<string[]>(
    [],
  );
  const [framesUrlsRecommended, setFramesUrlsRecommended] = useState<string[]>(
    [],
  );
  const [framesUrlsOptimal, setFramesUrlsOptimal] = useState<string[]>([]);
  const [framesUrlsOptimal2, setFramesUrlsOptimal2] = useState<string[]>([]);
  const [framesUrlsOptimal3, setFramesUrlsOptimal3] = useState<string[]>([]);

  const [framesLoading, setFramesLoading] = useState(false);

  // ── загрузка схемы ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    schemasApi
      .getById(Number(id))
      .then((data: any) => setSchemaData(data))
      .catch(() => setError("Не удалось загрузить карту полёта"))
      .finally(() => setLoading(false));
  }, [id]);

  // ── регенерация кадров ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!schemaData) return;

    const {
      base_image,
      traj_shapes,
      opt_results,
      drone_params,
      storyboard_results, 
      priority_opt_method,
    } = schemaData;

    if (!base_image) return;
    if (!storyboard_results) return;

    const imageUrl = `${API_BASE_URL}/${base_image.image_path.replace(
      /\\/g,
      "/",
    )}`;

    // Парсинг параметров с учетом новой структуры {source, parsedValue}
    const drn = drone_params?.drone ?? {};
    const cam = drone_params?.camera_params ?? {};

    const fov = getNum(cam.vertical_fov) ?? getNum(drn.default_vertical_fov) ?? 77;
    const resW = getNum(cam.resolution_width) ?? getNum(drn.default_resolution_width) ?? 5472;
    const resH = getNum(cam.resolution_height) ?? getNum(drn.default_resolution_height) ?? 3648;
    const baseDist = getNum(drone_params.base_distance) ?? 75;
    const plannedDist = getNum(drone_params.planned_distance) ?? 15;

    const frameHeightBase = calcFrameSize(baseDist, fov);
    const frameWidthBase = frameHeightBase * (resW / resH);
    const frameHeightPlanned = calcFrameSize(plannedDist, fov);
    const frameWidthPlanned = frameHeightPlanned * (resW / resH);

    const imgWidth = base_image.exif_data?.width ?? 0;
    const imgHeight = base_image.exif_data?.height ?? 0;

    const frameWidthPx =
      frameWidthBase > 0 ? imgWidth / (frameWidthBase / frameWidthPlanned) : 0;
    const frameHeightPx =
      frameHeightBase > 0
        ? imgHeight / (frameHeightBase / frameHeightPlanned)
        : 0;

    if (!frameWidthPx || !frameHeightPx) return;

    // Находим нужные раскадровки по storyboard_name_id
    // 1 - Point, 2 - Recommended, 3 - Optimal
    const storyboard_point = storyboard_results?.storyboards?.find((sb: any) => sb.storyboard_name_id === 1);
    const storyboard_recommended = storyboard_results?.storyboards?.find((sb: any) => sb.storyboard_name_id === 2);
    const storyboard_optimal = storyboard_results?.storyboards?.find((sb: any) => sb.storyboard_name_id === 3);
    const storyboard_optimal_big_density = storyboard_results?.storyboards?.find((sb: any) => sb.storyboard_name_id === 4);
    const storyboard_optimal_combi = storyboard_results?.storyboards?.find((sb: any) => sb.storyboard_name_id === 5);

    // Находим результат оптимизации по приоритетному методу (или методу ID 1)
    const optItemPriority = opt_results?.items?.find((item: any) => item.method_id === priority_opt_method?.method_id);
    const optItem = opt_results?.items?.find((item: any) => item.method_id === 1);
    const optItem2 = opt_results?.items?.find((item: any) => item.method_id === 2);
    const optItem3 = opt_results?.items?.find((item: any) => item.method_id === 3);

    // if (!storyboard_point && !storyboard_optimal) return;

    let cancelled = false;

    const run = async () => {
      setFramesLoading(true);
      try {
        const img = await loadImage(imageUrl);
        if (cancelled) return;

        // ── точечная ──────────────────────────────────────────────────────────
        if (storyboard_point && traj_shapes?.points?.length > 0) {
          const blobs = await Promise.all(
            (traj_shapes.points as Point[]).map((p) =>
              cropFrameKonva(img, p.x, p.y, frameWidthPx, frameHeightPx),
            ),
          );
          if (!cancelled)
            setFramesUrlsPointBased(blobs.map((b) => URL.createObjectURL(b)));
        }

        // ── рекомендуемая ─────────────────────────────────────────────────────
        if (
          storyboard_recommended &&
          storyboard_recommended.points?.length > 0
        ) {
          const blobs = await Promise.all(
            (storyboard_recommended.points as Point[]).map((p) =>
              cropFrameKonva(img, p.x, p.y, frameWidthPx, frameHeightPx),
            ),
          );
          if (!cancelled)
            setFramesUrlsRecommended(blobs.map((b) => URL.createObjectURL(b)));
        }

        // ── оптимальная ───────────────────────────────────────────────────────
        if (storyboard_optimal && optItem?.taxons?.B.length > 0) {
          const mToPxW = frameWidthBase > 0 ? imgWidth / frameWidthBase : 1;
          const mToPxH = frameHeightBase > 0 ? imgHeight / frameHeightBase : 1;

          const pointsFromB: Point[] = optItem.taxons.B.flatMap(
            (taxon: any) =>
              (taxon.points ?? taxon.route ?? []).map((pt: number[]) => ({
                x: pt[0] * mToPxW,
                y: imgHeight - pt[1] * mToPxH,
              })),
          );

          if (pointsFromB.length > 0) {
            const blobs = await Promise.all(
              pointsFromB.map((p) =>
                cropFrameKonva(img, p.x, p.y, frameWidthPx, frameHeightPx),
              ),
            );
            if (!cancelled)
              setFramesUrlsOptimal(blobs.map((b) => URL.createObjectURL(b)));
          }
        }
        if (storyboard_optimal_big_density && optItem2?.taxons?.B.length > 0) {
          const mToPxW = frameWidthBase > 0 ? imgWidth / frameWidthBase : 1;
          const mToPxH = frameHeightBase > 0 ? imgHeight / frameHeightBase : 1;

          const pointsFromB: Point[] = optItem2.taxons.B.flatMap(
            (taxon: any) =>
              (taxon.points ?? taxon.route ?? []).map((pt: number[]) => ({
                x: pt[0] * mToPxW,
                y: imgHeight - pt[1] * mToPxH,
              })),
          );

          if (pointsFromB.length > 0) {
            const blobs = await Promise.all(
              pointsFromB.map((p) =>
                cropFrameKonva(img, p.x, p.y, frameWidthPx, frameHeightPx),
              ),
            );
            if (!cancelled)
              setFramesUrlsOptimal2(blobs.map((b) => URL.createObjectURL(b)));
          }
        }
        if (storyboard_optimal_combi && optItem3?.taxons?.B.length > 0) {
          const mToPxW = frameWidthBase > 0 ? imgWidth / frameWidthBase : 1;
          const mToPxH = frameHeightBase > 0 ? imgHeight / frameHeightBase : 1;

          const pointsFromB: Point[] = optItem3.taxons.B.flatMap(
            (taxon: any) =>
              (taxon.points ?? taxon.route ?? []).map((pt: number[]) => ({
                x: pt[0] * mToPxW,
                y: imgHeight - pt[1] * mToPxH,
              })),
          );

          if (pointsFromB.length > 0) {
            const blobs = await Promise.all(
              pointsFromB.map((p) =>
                cropFrameKonva(img, p.x, p.y, frameWidthPx, frameHeightPx),
              ),
            );
            if (!cancelled)
              setFramesUrlsOptimal3(blobs.map((b) => URL.createObjectURL(b)));
          }
        }
      } catch (e) {
        console.error("Ошибка при генерации кадров:", e);
      } finally {
        if (!cancelled) setFramesLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      setFramesUrlsPointBased((prev) => {
        prev.forEach(URL.revokeObjectURL);
        return [];
      });
      setFramesUrlsRecommended((prev) => {
        prev.forEach(URL.revokeObjectURL);
        return [];
      });
      setFramesUrlsOptimal((prev) => {
        prev.forEach(URL.revokeObjectURL);
        return [];
      });
      setFramesUrlsOptimal2((prev) => {
        prev.forEach(URL.revokeObjectURL);
        return [];
      });
      setFramesUrlsOptimal3((prev) => {
        prev.forEach(URL.revokeObjectURL);
        return [];
      });
    };
  }, [schemaData]);

  // ── навигация ───────────────────────────────────────────────────────────────
  const handleClose = () => {
    if (page && pageSize)
      navigate(`/trajectories?page=${page}&pageSize=${pageSize}`);
    else navigate(-1);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const handleScrollTop = () =>
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });

  // ── loading / error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Загрузка полётной карты…
        </Typography>
      </Box>
    );
  }

  if (error || !schemaData) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          gap: 2,
        }}
      >
        <Typography color="error">{error ?? "Схема не найдена"}</Typography>
        <Button variant="outlined" onClick={handleClose}>
          Вернуться назад
        </Button>
      </Box>
    );
  }

  // ── маппинг данных ──────────────────────────────────────────────────────────
  const {
    base_image,
    drone_params,
    traj_shapes,
    weather,
    priority_opt_method,
    opt_results,
    storyboard_results,
  } = schemaData;

  const imageData = base_image
    ? {
        imageUrl: `${API_BASE_URL}/${base_image.image_path.replace(
          /\\/g,
          "/",
        )}`,
        fileName: base_image.source_filename ?? "",
        width: base_image.exif_data?.width ?? 0,
        height: base_image.exif_data?.height ?? 0,
      }
    : null;

  const exifData = base_image?.exif_data ? [base_image.exif_data] : [];

  let droneParams: DroneParams = FALLBACK_DRONE_PARAMS;

  if (drone_params) {
    const drn = drone_params.drone ?? {};
    const cam = drone_params.camera_params ?? {};

    const fov = getNum(cam.vertical_fov) ?? getNum(drn.default_vertical_fov) ?? 77;
    const resW = getNum(cam.resolution_width) ?? getNum(drn.default_resolution_width) ?? 5472;
    const resH = getNum(cam.resolution_height) ?? getNum(drn.default_resolution_height) ?? 3648;
    const baseDist = getNum(drone_params.base_distance) ?? 75;
    const plannedDist = getNum(drone_params.planned_distance) ?? 15;

    const frameHeightBase = calcFrameSize(baseDist, fov);
    const frameWidthBase = frameHeightBase * (resW / resH);
    const frameHeightPlanned = calcFrameSize(plannedDist, fov);
    const frameWidthPlanned = frameHeightPlanned * (resW / resH);

    droneParams = {
      selectedDroneId: String(drn.drone_id ?? ""),
      frameHeightBase,
      frameWidthBase,
      frameHeightPlanned,
      frameWidthPlanned,
      distance: baseDist,
      plannedDistance: plannedDist,
      considerObstacles: drone_params.is_consider_obstacles ?? true,
      uavCameraParams: {
        fov,
        resolutionWidth: resW,
        resolutionHeight: resH,
        useFromReference: cam.is_from_dictionary ?? true,
      },
      speed: getNum(drone_params.speed) ?? 5,
      batteryTime: getNum(drone_params.battery_time) ?? 30,
      hoverTime: getNum(drone_params.hover_time) ?? 5,
      windResistance: getNum(drone_params.wind_resistance) ?? 15,
      model: drn.model ?? "unknown",
    };
  }

  const weatherConditions: Weather = {
    windSpeed: getNum(weather.wind_speed),
    windDirection: getNum(weather.wind_direction),
    useWeatherApi: weather.is_use_api,
    isUse: schemaData.is_use_weather,
    position: { lat: weather.latitude ?? 53, lon: weather.longitude ?? 59 },
  };

  const points = traj_shapes?.points ?? [];
  const obstacles = traj_shapes?.obstacles ?? [];
  const flightLineY: number | undefined =
    traj_shapes?.line != null ? traj_shapes.line : undefined;

  // Находим приоритетный результат оптимизации
  // const priorityOptItem = opt_results?.items?.find((item: any) => item.method_id === priority_opt_method?.method_id);
  // const trajectoryData = priorityOptItem?.taxons;
  const trajectoryData = opt_results?.items?.find((item: any) => item.method_id === 1)?.taxons;
  const trajectoryData2 = opt_results?.items?.find((item: any) => item.method_id === 2)?.taxons;
  const trajectoryData3 = opt_results?.items?.find((item: any) => item.method_id === 3)?.taxons;

  // Собираем раскадровки из массива storyboard_results.storyboards
  const storyboardsData: Storyboards = {
    point: FALLBACK_STORYBOARDS.point,
    recommended: FALLBACK_STORYBOARDS.recommended,
    optimal: FALLBACK_STORYBOARDS.optimal,
    optimal_big_density: FALLBACK_STORYBOARDS.optimal_big_density,
    optimal_combi: FALLBACK_STORYBOARDS.optimal_combi
  };

  storyboard_results?.storyboards?.forEach((sb: any) => {
    if (sb.storyboard_name_id === 1) {
      storyboardsData.point = { ...sb, applied: true };
    } else if (sb.storyboard_name_id === 2) {
      storyboardsData.recommended = { ...sb, applied: true };
    } else if (sb.storyboard_name_id === 3) {
      storyboardsData.optimal = { ...sb, applied: true };
    } else if (sb.storyboard_name_id === 4) {
      storyboardsData.optimal_big_density = { ...sb, applied: true };
    } else if (sb.storyboard_name_id === 5) {
      storyboardsData.optimal_combi = { ...sb, applied: true };
    }
  });

  const frameWidthPx =
    imageData && droneParams.frameWidthBase > 0
      ? imageData.width /
        (droneParams.frameWidthBase / droneParams.frameWidthPlanned)
      : 0;
  const frameHeightPx =
    imageData && droneParams.frameHeightBase > 0
      ? imageData.height /
        (droneParams.frameHeightBase / droneParams.frameHeightPlanned)
      : 0;

  // ── рендер ──────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{ height: "100%", overflow: "auto", maxHeight: "100%" }}
      ref={containerRef}
    >
      {framesLoading && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.75)",
            zIndex: 9999,
            gap: 2,
          }}
        >
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Формирование кадров…
          </Typography>
        </Box>
      )}

      <FlightSchemaPage
        imageData={imageData}
        exifData={exifData}
        onClose={handleClose}
        weatherConditions={weatherConditions}
        droneParams={droneParams}
        points={points}
        obstacles={obstacles}
        trajectoryData={trajectoryData}
        trajectoryData2={trajectoryData2}
        trajectoryData3={trajectoryData3}
        frameWidthPx={frameWidthPx}
        frameHeightPx={frameHeightPx}
        storyboardsData={storyboardsData}
        pointsRecommended={storyboardsData.recommended.points || []}
        flightLineY={flightLineY}
        framesUrlsPointBased={framesUrlsPointBased}
        framesUrlsRecommended={framesUrlsRecommended}
        framesUrlsOptimal={framesUrlsOptimal}
        framesUrlsOptimal2={framesUrlsOptimal2}
        framesUrlsOptimal3={framesUrlsOptimal3}
        priorityMethod={priority_opt_method?.pretty_name || "Неизвестно"}
        schemaName={schemaData.map_name}
        createdAt={schemaData.created_at}
        author={schemaData.user}
      />

      <Zoom in={true}>
        <Box
          onClick={handleScrollTop}
          role="presentation"
          sx={{ position: "fixed", bottom: 24, right: 32, zIndex: 1000 }}
        >
          <Tooltip title="Наверх" arrow>
            <Fab
              size="small"
              sx={{ bgcolor: "#004E9E", "&:hover": { bgcolor: "#004E9E" } }}
            >
              <KeyboardArrowUpIcon sx={{ fill: "white" }} />
            </Fab>
          </Tooltip>
        </Box>
      </Zoom>
    </Box>
  );
}