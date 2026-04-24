import * as React from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  CircularProgress,
  useTheme,
  Divider,
} from "@mui/material";
import { useDropzone, FileRejection } from "react-dropzone";

import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import FindReplaceOutlinedIcon from "@mui/icons-material/FindReplaceOutlined";

import useNotifications from "../../../hooks/useNotifications/useNotifications";
import type { ExifData } from "../../../types/common.types";
import { useDialogs } from "../../../hooks/useDialogs/useDialogs";

import heic2any from "heic2any";

// ─── Константы ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30 МБ

// Словарь для перевода ключей EXIF на русский (UX улучшение)
const EXIF_LABELS: Partial<Record<keyof ExifData, string>> = {
  fileName: "Имя файла",
  fileSize: "Размер",
  width: "Ширина",
  height: "Высота",
  dateTime: "Дата и время",
  make: "Производитель",
  model: "Модель",
  orientation: "Ориентация",
  xResolution: "Разрешение (X)",
  yResolution: "Разрешение (Y)",
  resolutionUnit: "Ед. измерения",
  software: "Программа",
  focalLength: "Фокусное расст.",
  focalLengthIn35mmFormat: "Фокус (35мм)",
  latitude: "Широта",
  longitude: "Долгота",
};

const EXIF_KEYS_GROUP_1: (keyof ExifData)[] = [
  "fileName",
  "fileSize",
  "width",
  "height",
  "dateTime",
  "make",
];

const EXIF_KEYS_GROUP_2: (keyof ExifData)[] = [
  "model",
  "orientation",
  "xResolution",
  "yResolution",
  "resolutionUnit",
  "software",
];

const EXIF_KEYS_GROUP_3: (keyof ExifData)[] = [
  "focalLength",
  "focalLengthIn35mmFormat",
  "latitude",
  "longitude",
];

// ─── Утилиты ─────────────────────────────────────────────────────────────────

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const readImageDimensions = (
  file: File,
): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      reject(new Error("Не удалось загрузить изображение"));
      URL.revokeObjectURL(url);
    };

    img.src = url;
  });

const convertHeicIfNeeded = async (file: File): Promise<File> => {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif");

  if (!isHeic) return file;

  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });

  const blob = Array.isArray(converted) ? converted[0] : converted;
  const newName = file.name
    .replace(/\.heic$/i, ".jpg")
    .replace(/\.heif$/i, ".jpg");
  return new File([blob], newName, { type: "image/jpeg" });
};

// ─── Вспомогательный компонент: таблица EXIF ─────────────────────────────────

interface ExifTableProps {
  data: ExifData;
  keys: (keyof ExifData)[];
  title: string;
}

const ExifTable: React.FC<ExifTableProps> = ({ data, keys, title }) => {
  const rows = keys
    .filter((key) => key in data)
    .map((key) => ({ key, value: data[key] }));

  if (rows.length === 0) return null;

  const formatValue = (key: keyof ExifData, value: unknown): string => {
    if (value === undefined || value === null || value === "") return "—";
    if (key === "width" || key === "height") return `${value} px`;
    return String(value);
  };

  return (
    // Убрали component={Paper}, чтобы не было двойной тени/рамки от TableContainer
    <TableContainer
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderColor: "divider",
        overflowY: "auto",
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <Table size="small">
        <TableHead sx={{ backgroundColor: "grey.50" }}>
          <TableRow>
            <TableCell
              sx={{
                fontWeight: "bold",
                width: "50%",
                minHeight: 65,
                display: "flex",
                alignItems: "center"
              }}
            >
              {title}
            </TableCell>
            <TableCell sx={{ fontWeight: "bold", width: "50%" }}>
              Значение
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ key, value }) => (
            <TableRow key={key} hover>
              <TableCell component="th" scope="row" variant="head">
                {EXIF_LABELS[key] || key}
              </TableCell>
              <TableCell sx={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                {formatValue(key, value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// ─── Интерфейс пропсов ────────────────────────────────────────────────────────

interface ImageUploadStepProps {
  onUpload: (files: File[], exifData: ExifData[]) => void;
  onDelete: () => void;
  initialFiles?: File[];
  initialExifData?: ExifData[];
  initialImageUrl?: string;
}

// ─── Основной компонент ───────────────────────────────────────────────────────

const ImageUploadStep: React.FC<ImageUploadStepProps> = ({
  onUpload,
  onDelete,
  initialFiles,
  initialExifData,
  initialImageUrl,
}) => {
  const theme = useTheme(); // Используем тему для консистентности цветов
  const notifications = useNotifications();
  const { confirm } = useDialogs();

  const [files, setFiles] = React.useState<File[]>(initialFiles ?? []);
  const [exifData, setExifData] = React.useState<ExifData[]>(
    initialExifData ?? [],
  );
  const [isLoadingExif, setIsLoadingExif] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [showOriginalSize, setShowOriginalSize] = React.useState(false);

  const imageUrl = initialImageUrl ?? "";
  const inputRef = React.useRef<HTMLInputElement>(null);

  // ── Чтение EXIF ────────────────────────────────────────────────────────────

  const readExif = React.useCallback(
    async (file: File) => {
      setIsLoadingExif(true);
      setError(null);

      try {
        const exifr = await import("exifr");
        const tags = await exifr.parse(file);

        let width: number;
        let height: number;

        if (tags?.ImageWidth && tags?.ImageHeight) {
          width = tags.ImageWidth;
          height = tags.ImageHeight;
        } else {
          ({ width, height } = await readImageDimensions(file));
        }

        const newExifData: ExifData = {
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          width,
          height,
          dateTime: tags?.DateTimeOriginal ?? tags?.DateTime,
          make: tags?.Make,
          model: tags?.Model,
          orientation: tags?.Orientation,
          xResolution: tags?.XResolution,
          yResolution: tags?.YResolution,
          resolutionUnit: tags?.ResolutionUnit,
          software: tags?.Software,
          focalLength: tags?.FocalLength,
          focalLengthIn35mmFormat: tags?.FocalLengthIn35mmFormat,
          latitude:
            tags?.latitude != null && !Number.isNaN(tags.latitude)
              ? String(tags.latitude)
              : "",
          longitude:
            tags?.longitude != null && !Number.isNaN(tags.longitude)
              ? String(tags.longitude)
              : "",
        };

        setExifData([newExifData]);
        onUpload([file], [newExifData]);
      } catch (err) {
        console.error("Ошибка при чтении EXIF:", err);
        setError("Не удалось прочитать метаданные изображения");
      } finally {
        setIsLoadingExif(false);
      }
    },
    [onUpload],
  );

  // ── Обработка загрузки файла ───────────────────────────────────────────────

  const handleFileDrop = React.useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        setError(`Ошибка: ${fileRejections[0].errors[0].message}`);
        return;
      }

      const raw = acceptedFiles.find(
        (f) =>
          f.type.startsWith("image/") ||
          f.name.toLowerCase().endsWith(".heic") ||
          f.name.toLowerCase().endsWith(".heif"),
      );
      if (!raw) return;

      setIsLoadingExif(true);

      try {
        const file = await convertHeicIfNeeded(raw);

        setFiles([file]);
        notifications.show("Изображение загружено", {
          severity: "success",
          autoHideDuration: 3000,
        });

        readExif(file);
      } catch (err) {
        console.error("Ошибка конвертации HEIC:", err);
        setError("Не удалось конвертировать HEIC-изображение");
        setIsLoadingExif(false);
      }
    },
    [readExif, notifications],
  );

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileDrop([file], []);
      }
      e.target.value = "";
    },
    [handleFileDrop],
  );

  const handleOpenFileDialog = React.useCallback(() => {
    inputRef.current?.click();
  }, []);

  // ── Удаление ───────────────────────────────────────────────────────────────

  const handleDelete = React.useCallback(async () => {
    const shouldDelete = await confirm(
      "Вы действительно хотите удалить изображение?",
      {
        title: "Подтверждение",
        okText: "Да",
        cancelText: "Нет",
      }
    );

    if (!shouldDelete) return;

    setFiles([]);
    setExifData([]);
    setError(null);
    onDelete();
  }, [onDelete, confirm]);

  // ── Dropzone ───────────────────────────────────────────────────────────────

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".dng"] },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        p: 2,
        display: "flex",
        height: "100%",
        width: "100%",
        flexDirection: "column",
        gap: 2, // Удобнее чем mb: 2 у каждого элемента
      }}
    >
      {/* Скрытый input вынесен в корень */}
      <input
        type="file"
        ref={inputRef}
        style={{ display: "none" }}
        accept="image/png, image/jpeg, image/dng"
        onChange={handleInputChange}
      />

      {files.length > 0 ? (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="h6">Информация о загруженном изображении</Typography>

          {/* Карточка файла */}
          <Paper
            variant="outlined" // variant="outlined" выглядит аккуратнее чем elevation=0 + кастомный border
            sx={{
              display: "flex",
              alignItems: "center",
              p: 1.5,
              borderRadius: 1,
              cursor: "pointer",
              transition: "background-color 0.2s",
              "&:hover": { backgroundColor: theme.palette.action.hover },
            }}
            onClick={() => setIsPreviewOpen(true)}
          >
            {/* Миниатюра */}
            <Tooltip title="Просмотр">
              <Box
                role="button"
                aria-label="Открыть предпросмотр"
                onClick={(e) => { e.stopPropagation(); setIsPreviewOpen(true); }}
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 1,
                  backgroundColor: "grey.100",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mr: 2,
                  cursor: "pointer",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Превью"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
              </Box>
            </Tooltip>

            {/* Инфо о файле */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap fontWeight={500}>
                {files[0].name}
              </Typography>
              {exifData[0]?.fileSize && (
                <Typography variant="caption" color="text.secondary">
                  {exifData[0].fileSize}
                </Typography>
              )}
            </Box>

            {/* Разделитель перед кнопками */}
            {/* <Divider orientation="vertical" flexItem sx={{ mx: 1 }} /> */}

            {/* Действия */}
            <Box sx={{ flexShrink: 0, display: "flex", gap: 1 }}>
              <Tooltip title="Просмотр">
                <IconButton
                  onClick={(e) => { e.stopPropagation(); setIsPreviewOpen(true); }}
                  size="small"
                  color="primary"
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Заменить">
                <IconButton
                  onClick={(e) => { e.stopPropagation(); handleOpenFileDialog(); }}
                  size="small"
                  color="primary"
                >
                  <FindReplaceOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Удалить">
                <IconButton
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                  size="small"
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>

          {/* Метаданные */}
          <Typography variant="h6">Метаданные изображения</Typography>

          {error && <Alert severity="error">{error}</Alert>}

          {isLoadingExif ? (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            exifData.length > 0 && (
              <Grid
                container
                spacing={2}
                sx={{
                  flex: 1,              // Занимает всё оставшееся место
                  minHeight: 250,       // Минимальная высота
                  maxHeight: "calc(100vh - 350px)", // Не растягивать слишком сильно
                }}
              >
                <Grid size={{ xs: 12, md: 4 }} sx={{ height: "100%", display: "flex" }}>
                  <ExifTable data={exifData[0]} keys={EXIF_KEYS_GROUP_1} title="Основная информация" />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }} sx={{ height: "100%", display: "flex" }}>
                  <ExifTable data={exifData[0]} keys={EXIF_KEYS_GROUP_2} title="Параметры изображения" />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }} sx={{ height: "100%", display: "flex" }}>
                  <ExifTable data={exifData[0]} keys={EXIF_KEYS_GROUP_3} title="Геоданные и оптика" />
                </Grid>
              </Grid>
            )
          )}
        </Box>
      ) : (
        <>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Зона загрузки */}
          <Box
            {...getRootProps()}
            sx={{
              border: "2px dashed",
              borderColor: isDragActive ? theme.palette.primary.dark : "divider",
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: isDragActive
                ? theme.palette.action.hover
                : theme.palette.background.paper,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: theme.palette.primary.dark,
              },
            }}
          >
            <input {...getInputProps()} />
            <FileUploadOutlinedIcon
              sx={{ fontSize: 55, color: "primary.dark", mb: 1 }}
            />
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
              Перетащите изображение сюда
            </Typography>
            <Typography variant="caption" color="text.secondary">
              или нажмите для выбора файла (JPG, PNG, DNG, не более 30 МБ)
            </Typography>
          </Box>
        </>
      )}

      {/* Диалог предпросмотра */}
      <Dialog
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            height: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          Просмотр загруженного изображения
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showOriginalSize}
                  onChange={(e) => setShowOriginalSize(e.target.checked)}
                  size="small"
                  color="primary" // Используем стандартный цвет темы
                />
              }
              label={
                <Typography variant="body2">
                  Оригинал ({exifData[0]?.width ?? "—"} ×{" "}
                  {exifData[0]?.height ?? "—"} px)
                </Typography>
              }
            />
            <IconButton
              onClick={() => setIsPreviewOpen(false)}
              aria-label="Закрыть"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
            p: 2,
          }}
        >
          <Box
            sx={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: showOriginalSize ? "auto" : "hidden",
              width: "100%",
            }}
          >
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Полноэкранный просмотр"
                style={
                  showOriginalSize
                    ? {} // натуральный размер, скролл через родителя
                    : {
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }
                }
              />
            )}
          </Box>

          {showOriginalSize && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, textAlign: "center" }}
            >
              Используйте полосы прокрутки для перемещения по изображению
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ImageUploadStep;