import { type GridLocaleText } from "@mui/x-data-grid";

export const DRAWER_WIDTH = 300; // px
export const MINI_DRAWER_WIDTH = 120; // px
export const MAX_DESCRIPTION_LENGTH = 255;

export const russianLocale: GridLocaleText = {
  // Панель пагинации
  paginationRowsPerPage: "Записей на странице",

  paginationItemAriaLabel: (type) => {
    if (type === "first") {
      return "Первая страница";
    }
    if (type === "last") {
      return "Последняя страница";
    }
    if (type === "next") {
      return "Следующая страница";
    }

    return "Предыдущая страница";
  },

  paginationDisplayedRows: ({ from, to, count, estimated }) => {
    if (!estimated) {
      return `${from}–${to} из ${count !== -1 ? count : `more than ${to}`}`;
    }
    const estimatedLabel =
      estimated && estimated > to ? `around ${estimated}` : `more than ${to}`;
    return `${from}–${to} из ${count !== -1 ? count : estimatedLabel}`;
  },

  // Отображение строк
  noRowsLabel: "Нет данных",
  noResultsOverlayLabel: "Результаты не найдены",

  // Сортировка
  columnMenuLabel: "Меню столбца",
  columnMenuShowColumns: "Показать столбцы",
  columnMenuFilter: "Фильтр",
  columnMenuHideColumn: "Скрыть",
  columnMenuUnsort: "Отменить сортировку",
  columnMenuSortAsc: "Сортировать по возрастанию",
  columnMenuSortDesc: "Сортировать по убыванию",

  // Фильтрация
  filterPanelAddFilter: "Добавить фильтр",
  filterPanelDeleteIconLabel: "Удалить",
  filterPanelOperatorAnd: "И",
  filterPanelOperatorOr: "ИЛИ",
  filterPanelColumns: "Столбцы",
  filterPanelInputLabel: "Значение",
  filterPanelInputPlaceholder: "Значение фильтра",
  filterPanelOperator: "Операторы",
  filterOperatorContains: "Содержит",
  filterOperatorEquals: "Равно",
  filterOperatorStartsWith: "Начинается с",
  filterOperatorEndsWith: "Заканчивается на",
  filterOperatorIs: "Равно",
  filterOperatorNot: "Не равно",
  filterOperatorAfter: "Позже",
  filterOperatorOnOrAfter: "Не ранее",
  filterOperatorBefore: "Раньше",
  filterOperatorOnOrBefore: "Не позже",
  filterOperatorIsEmpty: "Пусто",
  filterOperatorIsNotEmpty: "Не пусто",
  filterOperatorIsAnyOf: "Любое из",

  // Columns management text
  columnsManagementSearchTitle: "Поиск",
  columnsManagementNoColumns: "Столбцы не найдены",
  columnsManagementShowHideAllText: "Показать/скрыть все",
  columnsManagementReset: "Сбросить",
  columnsManagementDeleteIconLabel: "Очистить",
  columnMenuManageColumns: "Видимость столбцов",

  noColumnsOverlayLabel: 'Нет столбцов',
  noColumnsOverlayManageColumns: 'Видимость столбцов',

  // Другие
  checkboxSelectionHeaderName: "Выбор строки",
  checkboxSelectionSelectAllRows: "Выбрать все строки",
  checkboxSelectionUnselectAllRows: "Отменить выбор всех строк",
};
