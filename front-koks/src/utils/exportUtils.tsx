// src/utils/exportUtils.ts
import * as XLSX from "xlsx-js-style";

// Общие стили
export const headerStyle = {
  font: { name: "Times New Roman", sz: 12, bold: true },
  border: {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
  },
  alignment: { horizontal: "center" },
};

export const cellStyle = {
  font: { name: "Times New Roman", sz: 12 },
  border: {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
  },
  alignment: { wrapText: true },
};

// Форматирует лист: стили + ширина колонок
export function formatWorksheet(worksheet: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

  // Применяем стили
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      if (!cell) continue;
      cell.s = R === 0 ? headerStyle : cellStyle;
    }
  }

  // Автоширина колонок
  const colWidths = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxWidth = 10;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      if (cell && cell.v) {
        const cellLength = String(cell.v).length;
        maxWidth = Math.max(maxWidth, cellLength);
      }
    }
    colWidths.push({ wch: Math.min(maxWidth + 5, 50) });
  }
  worksheet["!cols"] = colWidths;
}

export function createCoalUnloadingWorksheet(data: any[]) {
  if (!data || data.length === 0) {
    const worksheet = XLSX.utils.aoa_to_sheet([["Нет записей"]]);
    if (worksheet.A1) {
      worksheet.A1.s = headerStyle;
    }

    worksheet["!cols"] = [{ wch: 20 }];
    return worksheet;
  }

  const worksheetData = data.map((item) => ({
    "№": item.id,
    Поставщик: item.supplier?.name || `№ ${item.supplierId}`,
    "Марка кокса": item.cokeBrand?.name || `№ ${item.cokeBrandId}`,
    Шахтогруппа: item.shakhtogroup?.name || `№ ${item.shakhtogroupId}`,
    Станция: item.station?.name || `№ ${item.stationId}`,
    Штабель: item.pile?.description || `№ ${item.pileId}`,
    "Вид разгрузки":
      item.typeOfUnloading?.name || `№ ${item.typeOfUnloadingId}`,
    "Отметка начала": item.markStart?.description || `№ ${item.markStartId}`,
    "Отметка окончания": item.markEnd?.description || `№ ${item.markEndId}`,
    "Вагоны, шт": item.wagonCount,
    "Количество, т": Number(item.weightInTons).toFixed(2).replace(".", ","),
    "Дата и время разгрузки": new Date(item.unloadingDate).toLocaleString(
      "ru-RU"
    ),

    "Дата и время создания записи": new Date(item.createdAt).toLocaleString(
      "ru-RU"
    ),
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  formatWorksheet(worksheet);
  return worksheet;
}

export function createCoalReceiptWorksheet(data: any[]) {
  if (!data || data.length === 0) {
    const worksheet = XLSX.utils.aoa_to_sheet([["Нет записей"]]);
    if (worksheet.A1) {
      worksheet.A1.s = headerStyle;
    }

    worksheet["!cols"] = [{ wch: 20 }];
    return worksheet;
  }

  const worksheetData = data.map((item) => ({
    "№": item.id,
    Поставщик: item.supplier?.name || `№ ${item.supplierId}`,
    "Марка кокса": item.cokeBrand?.name || `№ ${item.cokeBrandId}`,
    Шахтогруппа: item.shakhtogroup?.name || `№ ${item.shakhtogroupId}`,
    "Натурный лист": item.naturalSheet?.reportDate
      ? `№ ${item.naturalSheetId} от ` +
        new Date(item.naturalSheet.reportDate).toLocaleDateString("ru-RU")
      : `№ ${item.naturalSheetId}`,
    "Вагоны, шт": item.wagonCount,
    "Количество, т": Number(item.weightInTons).toFixed(2).replace(".", ","),
    "Дата и время поступления": new Date(item.receiptDate).toLocaleString(
      "ru-RU"
    ),
    "Дата и время создания записи": new Date(item.createdAt).toLocaleString(
      "ru-RU"
    ),
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  formatWorksheet(worksheet);
  return worksheet;
}

export function createLoadingTowerWorksheet(data: any[]) {
  if (!data || data.length === 0) {
    const worksheet = XLSX.utils.aoa_to_sheet([["Нет записей"]]);
    if (worksheet.A1) {
      worksheet.A1.s = headerStyle;
    }

    worksheet["!cols"] = [{ wch: 20 }];
    return worksheet;
  }

  const worksheetData = data.map((item) => ({
    "№": item.id,
    Башня: item.tower
      ? `${item.tower.description || item.tower.id} (Батарея ${
          item.tower.numberOfCokeBattery
        })`
      : `№ ${item.towerId}`,
    Блок: item.block?.description || `№ ${item.blockId}`,
    Шахтогруппа: item.shakhtogroup?.name || `№ ${item.shakhtogroupId}`,
    Смена:
      item.workShift?.description + `, № ${item.workShiftId}` ||
      `№ ${item.workShiftId}`,
    "Пустота, м": Number(item.voidInMeters).toFixed(2).replace(".", ","),
    "Количество, т": Number(item.countTons).toFixed(2).replace(".", ","),
    "Дата и время погрузки": new Date(item.loadingDate).toLocaleString("ru-RU"),
    "Дата и время создания записи": new Date(item.createdAt).toLocaleString(
      "ru-RU"
    ),
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  formatWorksheet(worksheet);
  return worksheet;
}

export function createLoadingSilageWorksheet(data: any[]) {
  if (!data || data.length === 0) {
    const worksheet = XLSX.utils.aoa_to_sheet([["Нет записей"]]);
    if (worksheet.A1) {
      worksheet.A1.s = headerStyle;
    }

    worksheet["!cols"] = [{ wch: 20 }];
    return worksheet;
  }

  const worksheetData = data.map((item) => ({
    "№": item.id,
    Силос: item.silage?.description || `№ ${item.silageId}`,
    Блок: item.block?.description || `№ ${item.blockId}`,
    Шахтогруппа: item.shakhtogroup?.name || `№ ${item.shakhtogroupId}`,
    Смена: item.workShift?.description || `№ ${item.workShiftId}`,
    "Количество, т": Number(item.countTons).toFixed(2).replace(".", ","),
    "Дата и время погрузки": new Date(item.loadingDate).toLocaleString("ru-RU"),
    "Дата и время создания записи": new Date(item.createdAt).toLocaleString(
      "ru-RU"
    ),
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  formatWorksheet(worksheet);
  return worksheet;
}

export function createBunkerUnloadingWorksheet(data: any[]) {
  if (!data || data.length === 0) {
    const worksheet = XLSX.utils.aoa_to_sheet([["Нет записей"]]);
    if (worksheet.A1) {
      worksheet.A1.s = headerStyle;
    }

    worksheet["!cols"] = [{ wch: 20 }];
    return worksheet;
  }

  const worksheetData = data.map((item) => ({
    "№": item.id,
    Бункер: item.bunker?.description || `№ ${item.bunkerId}`,
    Блок: item.block?.description || `№ ${item.blockId}`,
    Штабель: item.pile?.description || `№ ${item.pileId}`,
    "Отметка начала": item.markStart?.description || `№ ${item.markStartId}`,
    "Отметка окончания": item.markEnd?.description || `№ ${item.markEndId}`,
    Шахтогруппа: item.shakhtogroup?.name || `№ ${item.shakhtogroupId}`,
    Смена: item.workShift?.description || `№ ${item.workShiftId}`,
    "Вагоны, шт": item.wagonCount,
    "Количество, т": Number(item.weightInTons).toFixed(2).replace(".", ","),
    "Дата и время выгрузки": new Date(item.unloadingDate).toLocaleString(
      "ru-RU"
    ),
    "Дата и время создания записи": new Date(item.createdAt).toLocaleString(
      "ru-RU"
    ),
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  formatWorksheet(worksheet);
  return worksheet;
}
