/**
 * Маппинг в короткое английское название
 * @param code - код метода (METHOD_1, METHOD_2, METHOD_3)
 */
export const getMethodShortEnglish = (code: string): string => {
  switch (code) {
    case "METHOD_1":
      return "low-d";
    case "METHOD_2":
      return "high-d";
    case "METHOD_3":
      return "mixed-d";
    default:
      return code; // Возвращаем исходный код, если совпадений нет
  }
};

/**
 * Маппинг в краткое русское название (аббревиатура)
 * @param code - код метода (METHOD_1, METHOD_2, METHOD_3)
 */
export const getMethodShortRussian = (code: string): string => {
  switch (code) {
    case "METHOD_1":
      return "НПТ"; // Низкой плотности точек
    case "METHOD_2":
      return "ВПТ"; // Высокой плотности точек
    case "METHOD_3":
      return "СПТ"; // Смешанной плотности точек
    default:
      return code;
  }
};

/**
 * Маппинг в полное русское название
 * @param code - код метода (METHOD_1, METHOD_2, METHOD_3)
 */
export const getMethodFullRussian = (code: string): string => {
  switch (code) {
    case "METHOD_1":
      return "Низкой плотности точек";
    case "METHOD_2":
      return "Высокой плотности точек";
    case "METHOD_3":
      return "Смешанной плотности точек";
    default:
      return code;
  }
};

/**
 * Маппинг из английского в короткое русское название
 * @param code
 */
export const getMethodFullRussianFromEnglish = (code: string): string => {
  switch (code) {
    case "low-d":
      return "Низкая плотность точек";
    case "high-d":
      return "Высокая плотность точек";
    case "mixed-d":
      return "Смешанная плотности точек";
    default:
      return code; // Возвращаем исходный код, если совпадений нет
  }
};