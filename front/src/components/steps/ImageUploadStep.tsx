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
} from "@mui/material";
import { useDropzone, FileRejection } from "react-dropzone";

import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import FindReplaceOutlinedIcon from "@mui/icons-material/FindReplaceOutlined";

import useNotifications from "../../hooks/useNotifications/useNotifications";
import type { ExifData } from "./common.types";

import heic2any from "heic2any";

// ─── Константы ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30 МБ

// Группы полей EXIF для таблиц метаданных — объявлены вне компонента,
// чтобы не пересоздаваться при каждом рендере.
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

/**
 * Форматирует размер файла в читаемую строку.
 * Чистая функция — вынесена за компонент.
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

/**
 * Читает натуральные размеры изображения через HTMLImageElement.
 * Используется как фолбэк, если EXIF не содержит данных о разрешении.
 */
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

/**
 * Конвертирует HEIC-файл в JPEG.
 * Возвращает новый File с типом image/jpeg.
 * Для не-HEIC файлов возвращает исходный файл без изменений.
 */
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

  // heic2any может вернуть Blob или Blob[] (если HEIC содержит несколько кадров)
  const blob = Array.isArray(converted) ? converted[0] : converted;

  // Создаём новый File с именем .jpg вместо .heic
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

/**
 * Отображает группу EXIF-полей в виде таблицы.
 * Вынесен в отдельный компонент, чтобы не объявлять функцию renderTable
 * внутри родительского компонента при каждом рендере.
 */
const ExifTable: React.FC<ExifTableProps> = ({ data, keys, title }) => {
  // Сохраняем порядок ключей согласно переданному массиву keys,
  // а не порядку свойств объекта.
  const rows = keys
    .filter((key) => key in data)
    .map((key) => ({ key, value: data[key] }));

  if (rows.length === 0) return null;

  const formatValue = (key: keyof ExifData, value: unknown): string => {
    if (value === undefined || value === null || value === "") return "—";
    if (key === "width" || key === "height") return `${value} px`;
    return String(value);
  };

  const formatLabel = (key: string): string =>
    key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");

  return (
    <TableContainer
      component={Paper}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #e0e0e0",
        overflowY: "auto",
      }}
    >
      <Table>
        <TableHead sx={{ borderBottom: "1px solid" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold", width: "50%" }}>
              {title}
            </TableCell>
            <TableCell sx={{ fontWeight: "bold", width: "50%" }}>
              Значение
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ key, value }) => (
            <TableRow key={key}>
              <TableCell component="th" scope="row">
                {formatLabel(key)}
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
  const notifications = useNotifications();

  const [files, setFiles] = React.useState<File[]>(initialFiles ?? []);
  const [exifData, setExifData] = React.useState<ExifData[]>(
    initialExifData ?? [],
  );
  const [isLoadingExif, setIsLoadingExif] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [showOriginalSize, setShowOriginalSize] = React.useState(false);

  // imageUrl управляется родителем через пропс — компонент не создаёт
  // и не отзывает URL самостоятельно, чтобы избежать двойного revokeObjectURL.
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

        // Предпочитаем размеры из EXIF; если их нет — читаем через Image
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
          // Предпочитаем дату съёмки, фолбэк — дата модификации файла
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
          // Координаты: exifr возвращает их в нижнем регистре после парсинга
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

      setIsLoadingExif(true); // показываем спиннер сразу, конвертация может занять секунду

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

  // Обработчик для скрытого <input type="file"> (кнопка «Заменить»)
  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        // Переиспользуем ту же логику, что и при drag-and-drop
        handleFileDrop([file], []);
      }
      // Сбрасываем value, чтобы onChange сработал повторно при выборе того же файла
      e.target.value = "";
    },
    [handleFileDrop],
  );

  const handleOpenFileDialog = React.useCallback(() => {
    inputRef.current?.click();
  }, []);

  // ── Удаление ───────────────────────────────────────────────────────────────

  const handleDelete = React.useCallback(() => {
    setFiles([]);
    setExifData([]);
    setError(null);
    onDelete();
  }, [onDelete]);

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
      }}
    >
      {files.length > 0 ? (
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" gutterBottom>
            Информация о загруженном изображении
          </Typography>

          {/* Карточка файла */}
          <Paper
            elevation={0}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 2,
              mb: 2,
              borderRadius: 1,
              border: "1px solid #e0e0e0",
            }}
          >
            {/* Миниатюра — открывает предпросмотр */}
            <Tooltip title="Просмотр">
              <Box
                role="button"
                aria-label="Открыть предпросмотр"
                onClick={() => setIsPreviewOpen(true)}
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 1,
                  backgroundColor: "#f5f5f5",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mr: 2,
                  cursor: "pointer",
                  overflow: "hidden",
                  border: "1px solid #e0e0e0",
                  flexShrink: 0,
                  "&:hover": { backgroundColor: "#f0f0f0" },
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
                      borderRadius: "4px",
                    }}
                  />
                )}
              </Box>
            </Tooltip>

            {/* Имя файла */}
            <Typography
              variant="body1"
              noWrap
              sx={{ flexGrow: 1, fontWeight: 500 }}
            >
              {files[0].name}
            </Typography>

            {/* Размер файла */}
            {exifData[0]?.fileSize && (
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ mr: 2, flexShrink: 0 }}
              >
                {exifData[0].fileSize}
              </Typography>
            )}

            {/* Действия */}
            <Box sx={{ flexShrink: 0 }}>
              <Tooltip title="Просмотр">
                <IconButton
                  onClick={() => setIsPreviewOpen(true)}
                  size="medium"
                  color="primary"
                >
                  <VisibilityIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Удалить">
                <IconButton onClick={handleDelete} size="medium" color="error">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Заменить">
                <IconButton
                  onClick={handleOpenFileDialog}
                  size="medium"
                  color="primary"
                >
                  <FindReplaceOutlinedIcon />
                </IconButton>
              </Tooltip>

              {/* Скрытый input — только для замены файла через кнопку.
                  Drag-and-drop идёт через useDropzone и не использует этот input. */}
              <input
                type="file"
                ref={inputRef}
                style={{ display: "none" }}
                accept="image/png, image/jpeg, image/dng"
                onChange={handleInputChange}
              />
            </Box>
          </Paper>

          {/* Метаданные */}
          <Typography variant="h6" gutterBottom>
            Метаданные изображения
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {isLoadingExif ? (
            <Box
              sx={{
                height: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            exifData.length > 0 && (
              <Grid container spacing={2} sx={{ height: 500, pb: 2 }}>
                <Grid
                  size={{ xs: 12, md: 4 }}
                  sx={{ height: "100%", display: "flex" }}
                >
                  <ExifTable
                    data={exifData[0]}
                    keys={EXIF_KEYS_GROUP_1}
                    title="Основная информация"
                  />
                </Grid>
                <Grid
                  size={{ xs: 12, md: 4 }}
                  sx={{ height: "100%", display: "flex" }}
                >
                  <ExifTable
                    data={exifData[0]}
                    keys={EXIF_KEYS_GROUP_2}
                    title="Параметры изображения"
                  />
                </Grid>
                <Grid
                  size={{ xs: 12, md: 4 }}
                  sx={{ height: "100%", display: "flex" }}
                >
                  <ExifTable
                    data={exifData[0]}
                    keys={EXIF_KEYS_GROUP_3}
                    title="Гео- и оптические данные"
                  />
                </Grid>
              </Grid>
            )
          )}
        </Box>
      ) : (
        <>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Зона загрузки */}
          <Box
            {...getRootProps()}
            sx={{
              border: "2px dashed #ccc",
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: isDragActive ? "#f0f8ff" : "hsl(220, 35%, 97%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              transition: "background-color 0.2s ease",
            }}
          >
            <input {...getInputProps()} />
            <FileUploadOutlinedIcon
              sx={{ fontSize: 55, color: "#014488", mb: 1 }}
            />
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
              Перетащите изображение сюда
            </Typography>
            <Typography variant="caption" color="textSecondary">
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
          }}
        >
          Просмотр загруженного изображения
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showOriginalSize}
                  onChange={(e) => setShowOriginalSize(e.target.checked)}
                  size="medium"
                  sx={{
                    color: "#014488",
                    "&.Mui-checked": { color: "#014488" },
                  }}
                />
              }
              label={
                <Typography variant="caption">Оригинальный размер</Typography>
              }
            />
            <IconButton
              onClick={() => setIsPreviewOpen(false)}
              aria-label="Закрыть"
              sx={{ color: "gray" }}
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
          </Box>

          {showOriginalSize && (
            <Typography
              variant="caption"
              color="textSecondary"
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
