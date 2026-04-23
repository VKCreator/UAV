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
import { api } from "../api/client";
import type { DroneParams, Weather } from "../types/uav.types";
import type { Storyboards } from "../types/storyboards.types";
import type { Point } from "../types/scene.types";

import { useDocumentTitle } from "../hooks/useDocumentTitle/useDocumentTitle";

// ─── Константы ───────────────────────────────────────────────────────────────

const API_BASE_URL = "http://skypath.ddnsking.com:5000";

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
};

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function calcFrameSize(distance: number, fovDeg: number): number {
  const fovRad = (fovDeg * Math.PI) / 180;
  return 2 * distance * Math.tan(fovRad / 2);
}

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

// ─── Компонент ───────────────────────────────────────────────────────────────

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
  const [framesLoading, setFramesLoading] = useState(false);

  // ── загрузка схемы ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    api.schemas
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
      opt1_result,
      drone_params,
      storyboard_point,
      storyboard_optimal,
    } = schemaData;

    if (!base_image) return;
    if (!storyboard_point && !storyboard_optimal) return;

    const imageUrl = `${API_BASE_URL}/${base_image.image_path.replace(
      /\\/g,
      "/",
    )}`;

    const drn = drone_params?.drone ?? {};
    const cam = drone_params?.camera_params ?? {};

    const fov = cam.vertical_fov ?? drn.fov_vertical ?? 77;
    const resW = cam.resolution_width ?? drn.resolution_width ?? 5472;
    const resH = cam.resolution_height ?? drn.resolution_height ?? 3648;
    const baseDist = drone_params?.base_distance ?? 75;
    const plannedDist = drone_params?.planned_distance ?? 15;

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
        if (storyboard_optimal && opt1_result?.taxons?.B.length > 0) {
          const mToPxW = frameWidthBase > 0 ? imgWidth / frameWidthBase : 1;
          const mToPxH = frameHeightBase > 0 ? imgHeight / frameHeightBase : 1;

          // Та же логика что в extractOptimalFrames в StoryboardEditor
          const pointsFromB: Point[] = opt1_result.taxons.B.flatMap(
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
    opt1_result,
    storyboard_point,
    storyboard_recommended,
    storyboard_optimal,
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

    const fov = cam.vertical_fov ?? drn.fov_vertical ?? 77;
    const resW = cam.resolution_width ?? drn.resolution_width ?? 5472;
    const resH = cam.resolution_height ?? drn.resolution_height ?? 3648;
    const baseDist = drone_params.base_distance ?? 75;
    const plannedDist = drone_params.planned_distance ?? 15;

    const frameHeightBase = calcFrameSize(baseDist, fov);
    const frameWidthBase = frameHeightBase * (resW / resH);
    const frameHeightPlanned = calcFrameSize(plannedDist, fov);
    const frameWidthPlanned = frameHeightPlanned * (resW / resH);

    droneParams = {
      selectedDroneId: String(drn.id ?? ""),
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
        useFromReference: cam.is_dictionary ?? true,
      },
      speed: drone_params.speed ?? 5,
      batteryTime: drone_params.battery_time ?? 30,
      hoverTime: drone_params.hover_time ?? 5,
      windResistance: drone_params.wind_resistance ?? 15,
      model: drn.model ?? "unknown",
    };
  }

  const weatherConditions: Weather = {
    windSpeed: weather.wind_speed,
    windDirection: weather.wind_direction,
    useWeatherApi: weather.is_use_api,
    isUse: weather.is_use_weather,
    position: { lat: weather.latitude ?? 53, lon: weather.longitude ?? 59 },
  };

  const points = traj_shapes?.points ?? [];
  const obstacles = traj_shapes?.obstacles ?? [];
  const flightLineY: number | undefined =
    traj_shapes?.line != null ? traj_shapes.line : undefined;

  const trajectoryData = opt1_result?.taxons;

  const storyboardsData: Storyboards = {
    point: storyboard_point
      ? { ...storyboard_point, applied: true }
      : FALLBACK_STORYBOARDS.point,
    recommended: storyboard_recommended
      ? { ...storyboard_recommended, applied: true }
      : FALLBACK_STORYBOARDS.recommended,
    optimal: storyboard_optimal
      ? { ...storyboard_optimal, applied: true }
      : FALLBACK_STORYBOARDS.optimal,
  };

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
        frameWidthPx={frameWidthPx}
        frameHeightPx={frameHeightPx}
        storyboardsData={storyboardsData}
        pointsRecommended={storyboardsData.recommended.points || []}
        flightLineY={flightLineY}
        framesUrlsPointBased={framesUrlsPointBased}
        framesUrlsRecommended={framesUrlsRecommended}
        framesUrlsOptimal={framesUrlsOptimal}
        schemaName={schemaData.schema_name}
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
