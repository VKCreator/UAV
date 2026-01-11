import dayjs from "dayjs";

export const DateToPrettyLocalDateTime = (date: string): string => {
  return date
    ? new Date(date).toLocaleString("ru-RU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";
};

export const utcToLocaleDateTimeString = (isoString: string): string => {
  const datetime = new Date(isoString);

  const formatted = datetime.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false, // 24-часовой формат
  });

  const [datePart, timePart] = formatted.split(", ");
  const [day, month, year] = datePart.split(".");

  return `${year}-${month}-${day}T${timePart}Z`;
};

export const localeDateTimeToUtcString = (localDateTime: string): string => {
  const [datePart, timePart] = localDateTime.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  const date = new Date(year, month - 1, day, hours, minutes);
  return date.toISOString();
};

export interface DateRangeUTC {
  start: string; // ISO string в UTC
  end: string; // ISO string в UTC
}

export const getDateRangeInUTC = (
  date: dayjs.Dayjs | null
): DateRangeUTC | null => {
  if (!date) return null;

  // 1. Создаём начало дня в локальном времени
  const startOfDay = date.startOf("day"); // 20.09.2025 00:00:00 (локальное время)

  // 2. Создаём конец дня в локальном времени
  const endOfDay = date.endOf("day"); // 20.09.2025 23:59:59.999 (локальное время)

  // 3. Конвертируем в UTC
  const startUTC = startOfDay.toISOString();
  const endUTC = endOfDay.toISOString();

  return {
    start: startUTC,
    end: endUTC,
  };
};
