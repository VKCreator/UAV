// src/api/client.ts
const API_BASE_URL = "http://vkcreator.ddns.net:3003";

// Универсальная функция для HTTP-запросов
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    throw new Error(
      errorData.error + "." || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return await response.json();
}

// Типы для ответов (можно расширить)
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Сервисы для разных сущностей
export const api = {
  // Поставщики
  suppliers: {
    getAll: () => request<ApiResponse<Supplier[]>>("/api/suppliers"),
    create: (data: CreateSupplierInput) =>
      request<ApiResponse<Supplier>>("/api/suppliers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    // ... update, delete
  },

  // Марки кокса
  cokeBrands: {
    getAll: () => request<ApiResponse<CokeBrand[]>>("/api/coke-brands"),
    create: (data: CreateCokeBrandInput) =>
      request<ApiResponse<CokeBrand>>("/api/coke-brands", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Шахтогруппы
  shakhtogroups: {
    getAll: () => request<ApiResponse<Shakhtogroup[]>>("/api/shakhtogroups"),
    create: (data: CreateShakhtogroupInput) =>
      request<ApiResponse<Shakhtogroup>>("/api/shakhtogroups", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Натурные листы
  naturalSheets: {
    getAll: () => request<ApiResponse<NaturalSheet[]>>("/api/natural-sheets"),
    create: (data: CreateNaturalSheetInput) =>
      request<ApiResponse<NaturalSheet>>("/api/natural-sheets", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  stations: {
    getAll: () => request<ApiResponse<Station[]>>("/api/stations"),
    create: (data: CreateStationInput) =>
      request<ApiResponse<Station>>("/api/stations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  typesOfUnloading: {
    getAll: () =>
      request<ApiResponse<TypeOfUnloading[]>>("/api/types-of-unloading"),
    create: (data: CreateTypeOfUnloadingInput) =>
      request<ApiResponse<TypeOfUnloading>>("/api/types-of-unloading", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  marks: {
    getAll: () => request<ApiResponse<Mark[]>>("/api/marks"),
    create: (data: CreateMarkInput) =>
      request<ApiResponse<Mark>>("/api/marks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  blocks: {
    getAll: () => request<ApiResponse<Block[]>>("/api/blocks"),
    create: (data: CreateBlockInput) =>
      request<ApiResponse<Block>>("/api/blocks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  towers: {
    getAll: () => request<ApiResponse<Tower[]>>("/api/towers"),
    create: (data: CreateTowerInput) =>
      request<ApiResponse<Tower>>("/api/towers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  workShifts: {
    getAll: () => request<ApiResponse<WorkShift[]>>("/api/work-shifts"),
    create: (data: CreateWorkShiftInput) =>
      request<ApiResponse<WorkShift>>("/api/work-shifts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  silages: {
    getAll: () => request<ApiResponse<Silage[]>>("/api/silages"),
    create: (data: CreateSilageInput) =>
      request<ApiResponse<Silage>>("/api/silages", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  bunkers: {
    getAll: () => request<ApiResponse<Bunker[]>>("/api/bunkers"),
    create: (data: CreateBunkerInput) =>
      request<ApiResponse<Bunker>>("/api/bunkers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  piles: {
    getAll: () => request<ApiResponse<Pile[]>>("/api/piles"),
    create: (data: CreatePileInput) =>
      request<ApiResponse<Pile>>("/api/piles", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  machinists: {
    getAll: () => request<ApiResponse<Machinist[]>>("/api/machinists"),
    create: (data: CreateMachinistInput) =>
      request<ApiResponse<Machinist>>("/api/machinists", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  coalHandlers: {
    getAll: () => request<ApiResponse<CoalHandler[]>>("/api/coal-handlers"),
    create: (data: CreateCoalHandlerInput) =>
      request<ApiResponse<CoalHandler>>("/api/coal-handlers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  // Поступления угля
  coalReceipts: {
    getAll: (filter?: { dateStart?: string; dateEnd?: string }) => {
      const params = new URLSearchParams();
      if (filter?.dateStart) {
        params.append("dateStart", filter.dateStart);
      }
      if (filter?.dateEnd) {
        params.append("dateEnd", filter.dateEnd);
      }

      const queryString = params.toString();
      const endpoint = `/api/coal-receipts${
        queryString ? `?${queryString}` : ""
      }`;

      return request<ApiResponse<CoalReceipt[]>>(endpoint);
    },
    create: (data: CreateCoalReceiptInput) =>
      request<ApiResponse<CoalReceipt>>("/api/coal-receipts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  coalUnloadings: {
    getAll: (filter?: { dateStart?: string; dateEnd?: string }) => {
      const params = new URLSearchParams();
      if (filter?.dateStart) {
        params.append("dateStart", filter.dateStart);
      }
      if (filter?.dateEnd) {
        params.append("dateEnd", filter.dateEnd);
      }

      const queryString = params.toString();
      const endpoint = `/api/coal-unloadings${
        queryString ? `?${queryString}` : ""
      }`;

      return request<ApiResponse<CoalUnloading[]>>(endpoint);
    },
    create: (data: CreateCoalUnloadingInput) =>
      request<ApiResponse<CoalUnloading>>("/api/coal-unloadings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  loadingTowers: {
    getAll: (filter?: { dateStart?: string; dateEnd?: string }) => {
      const params = new URLSearchParams();
      if (filter?.dateStart) {
        params.append("dateStart", filter.dateStart);
      }
      if (filter?.dateEnd) {
        params.append("dateEnd", filter.dateEnd);
      }

      const queryString = params.toString();
      const endpoint = `/api/loading-towers${
        queryString ? `?${queryString}` : ""
      }`;

      return request<ApiResponse<LoadingTower[]>>(endpoint);
    },
    create: (data: CreateLoadingTowerInput) =>
      request<ApiResponse<LoadingTower>>("/api/loading-towers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  loadingSilages: {
    getAll: (filter?: { dateStart?: string; dateEnd?: string }) => {
      const params = new URLSearchParams();
      if (filter?.dateStart) {
        params.append("dateStart", filter.dateStart);
      }
      if (filter?.dateEnd) {
        params.append("dateEnd", filter.dateEnd);
      }

      const queryString = params.toString();
      const endpoint = `/api/loading-silages${
        queryString ? `?${queryString}` : ""
      }`;

      return request<ApiResponse<LoadingSilage[]>>(endpoint);
    },
    create: (data: CreateLoadingSilageInput) =>
      request<ApiResponse<LoadingSilage>>("/api/loading-silages", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  bunkerUnloadings: {
    getAll: (filter?: { dateStart?: string; dateEnd?: string }) => {
      const params = new URLSearchParams();
      if (filter?.dateStart) {
        params.append("dateStart", filter.dateStart);
      }
      if (filter?.dateEnd) {
        params.append("dateEnd", filter.dateEnd);
      }

      const queryString = params.toString();
      const endpoint = `/api/bunker-unloadings${
        queryString ? `?${queryString}` : ""
      }`;

      return request<ApiResponse<BunkerUnloading[]>>(endpoint);
    },
    create: (data: CreateBunkerUnloadingInput) =>
      request<ApiResponse<BunkerUnloading>>("/api/bunker-unloadings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  technologicalCoals: {
    getAll: () =>
      request<ApiResponse<TechnologicalCoal[]>>("/api/technological-coals"),
    create: (data: CreateTechnologicalCoalInput) =>
      request<ApiResponse<TechnologicalCoal>>("/api/technological-coals", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  coalHandlerWorks: {
    getAll: () =>
      request<ApiResponse<CoalHandlerWork[]>>("/api/coal-handler-works"),
    create: (data: CreateCoalHandlerWorkInput) =>
      request<ApiResponse<CoalHandlerWork>>("/api/coal-handler-works", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};

// Экспортируем типы
export type Supplier = {
  id: number;
  name: string;
  description: string;
  actual: boolean;
};

export type CokeBrand = {
  id: number;
  name: string;
  description: string;
  actual: boolean;
};

export type Shakhtogroup = {
  id: number;
  name: string;
  description: string;
  actual: boolean;
};

export type NaturalSheet = {
  id: number;
  reportDate: string;
  description: string;
  createdAt: string;
};

// Станции
export type Station = {
  id: number;
  name: string;
  involvement: string;
};

// Виды разгрузки
export type TypeOfUnloading = {
  id: number;
  name: string;
  description: string;
};

// Отметки
export type Mark = {
  id: number;
  description: string;
};

// Блоки
export type Block = {
  id: number;
  description: string;
};

// Башни
export type Tower = {
  id: number;
  numberOfCokeBattery: number;
  usefulVolumeTons: number;
  description: string;
};

// Штабеля
export type Pile = {
  id: number;
  description: string;
};

// Смены
export type WorkShift = {
  id: number;
  description: string;
};

// Силосы
export type Silage = {
  id: number;
  description: string;
  usefulVolumeTons: number;
};

// Бункеры
export type Bunker = {
  id: number;
  name: string;
  description: string;
};

// Машинисты
export type Machinist = {
  id: number;
  workShiftId: number;
  fullName: string;

  workShift: {
    id: number;
    description: string;
  }
};

// Углеперегружатели
export type CoalHandler = {
  id: number;
  name: string;
  description: string;
};

export type CoalReceipt = {
  id: number;
  supplierId: number;
  cokeBrandId: number;
  shakhtogroupId: number;
  naturalSheetId: number;
  wagonCount: number;
  weightInTons: number;
  receiptDate: string;
  createdAt: string;
};

// Разгрузка углей
export type CoalUnloading = {
  id: number;
  supplierId: number;
  cokeBrandId: number;
  shakhtogroupId: number;
  stationId: number;
  pileId: number;
  typeOfUnloadingId: number;
  markStartId: number;
  markEndId: number;
  wagonCount: number;
  weightInTons: number;
  unloadingDate: string;
  createdAt: string;
};

// Погрузка на башни
export type LoadingTower = {
  id: number;
  blockId: number;
  towerId: number;
  workShiftId: number;
  shakhtogroupId: number;
  voidInMeters: number;
  countTons: number;
  loadingDate: string;
  createdAt: string;
};

// Погрузка на силосы
export type LoadingSilage = {
  id: number;
  blockId: number;
  silageId: number;
  workShiftId: number;
  shakhtogroupId: number;
  countTons: number;
  loadingDate: string;
  createdAt: string;
};

// Выгрузка в бункер
export type BunkerUnloading = {
  id: number;
  bunkerId: number;
  shakhtogroupId: number;
  pileId: number;
  markStartId: number;
  markEndId: number;
  blockId: number;
  workShiftId: number;
  wagonCount: number;
  weightInTons: number;
  unloadingDate: string;
  createdAt: string;
};

// Угли технологические
export type TechnologicalCoal = {
  snbPosition: string; // primary key
  supplierId: number;
  cokeBrandId: number;
  shakhtogroupId: number;
  name: string;
  description: string;
};

// Работа углеперегружателей
export type CoalHandlerWork = {
  id: number;
  coalHandlerId: number;
  shakhtogroupId: number;
  pileId: number;
  markStartId: number;
  markEndId: number;
  machinistId: number;
  startTime: string;
  endTime: string;
  tonsHandled: number;
  createdAt: string;
};

// Типы для создания
export type CreateSupplierInput = Omit<Supplier, "id">;
export type CreateCokeBrandInput = Omit<CokeBrand, "id">;
export type CreateShakhtogroupInput = Omit<Shakhtogroup, "id">;
export type CreateNaturalSheetInput = Omit<NaturalSheet, "id" | "createdAt">;
export type CreateStationInput = Omit<Station, "id">;
export type CreateTypeOfUnloadingInput = Omit<TypeOfUnloading, "id">;
export type CreateMarkInput = Omit<Mark, "id" | "createdAt">;
export type CreateBlockInput = Omit<Block, "id" | "createdAt">;
export type CreateTowerInput = Omit<Tower, "id" | "createdAt">;
export type CreateWorkShiftInput = Omit<WorkShift, "id">;
export type CreateSilageInput = Omit<Silage, "id" | "createdAt">;
export type CreateBunkerInput = Omit<Bunker, "id" | "createdAt">;
export type CreatePileInput = Omit<Pile, "id">;
export type CreateMachinistInput = Omit<Machinist, "id">;
export type CreateCoalHandlerInput = Omit<CoalHandler, "id" | "createdAt">;
export type CreateCoalReceiptInput = Omit<CoalReceipt, "id" | "createdAt">;
export type CreateCoalUnloadingInput = Omit<CoalUnloading, "id" | "createdAt">;
export type CreateLoadingTowerInput = Omit<LoadingTower, "id" | "createdAt">;
export type CreateLoadingSilageInput = Omit<LoadingSilage, "id" | "createdAt">;
export type CreateBunkerUnloadingInput = Omit<
  BunkerUnloading,
  "id" | "createdAt"
>;
export type CreateTechnologicalCoalInput = Omit<TechnologicalCoal, "createdAt">; // snbPosition — PK
export type CreateCoalHandlerWorkInput = Omit<
  CoalHandlerWork,
  "id" | "createdAt"
>;
