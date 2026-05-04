import math

import numpy as np

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns

from typing import List, Tuple, Optional

# Ветер
# https://www.betaenergy.ru/upload/medialibrary/6df/6dfd8840bcc2bd800edf271c98669f05.jpg
def wind_components(wind_speed: float, wind_dir_deg: float) -> tuple:
    """
    Вектор сноса ветром (wx, wy).
    wind_dir_deg — откуда дует ветер (метеорологическое соглашение):
        0°  = с севера (сносит на юг, Y-)
        90° = с востока (сносит на запад, X-)
    """
    wind_dir_deg = wind_dir_deg % 360.0
    rad = math.radians(wind_dir_deg)
    wx = -wind_speed * math.sin(rad)
    wy = -wind_speed * math.cos(rad)
    return wx, wy

# Навигационный треугольник
def navigation_triangle(p_from, p_to, v_drone, wind_speed, wind_dir_deg):
    """
    Вектор воздуха - воздушная скорость (v_drone)
    Вектор ветра (wind_speed, wind_dir_deg)
    Путевая скорость (GS)
    """
    dx = p_to[0] - p_from[0]
    dy = p_to[1] - p_from[1]
    # желаемый путевой угол
    TC = math.degrees(math.atan2(dx, dy)) % 360

    # навигационный ветер
    NW = (wind_dir_deg + 180) % 360

    # угол ветра
    WA = (NW - TC + 360) % 360

    sin_DA = wind_speed * math.sin(math.radians(WA)) / v_drone
    # Защита от float погрешностей
    sin_DA = max(-1.0, min(1.0, sin_DA))

    if abs(sin_DA) >= 1.0:
        # Если строго 1 или -1, DA = ±90°
        if abs(sin_DA) - 1.0 < 1e-12:
            DA = 90.0 if sin_DA > 0 else -90.0
        else:
            # ветер сильнее воздушной скорости 
            return None
    else:
        # угол сноса
        DA = math.degrees(math.asin(sin_DA))

    # курс летательного аппарата 
    TA = (TC - DA) % 360
 
    # путевая скорость
    GS = v_drone * math.cos(math.radians(DA)) + wind_speed * math.cos(math.radians(WA))

    if GS <= 1e-6:
        return None
 
    return {"TC": TC, "NW": NW, "WA": WA, "DA": DA, "TA": TA, "GS": GS}

def segment_with_wind(p_from, p_to, v_drone, wind_speed, wind_dir_deg, t_js=5.0, is_hover=True):
    """
    Возвращает все данные для одного сегмента маршрута.
    """
    nav = navigation_triangle(p_from, p_to, v_drone, wind_speed, wind_dir_deg)

    if nav is None or nav["GS"] <= 1e-6:
        return None
    
    dist = math.hypot(p_to[0] - p_from[0], p_to[1] - p_from[1])
    GS = nav["GS"]
    
    if abs(GS) <= 1e-6:
        return None
    
    time_move = 1.5 * dist / GS
    time_total = time_move + (t_js if is_hover else 0.0)
    
    # Для визуализации курса на фронте (короткая стрелка из p_from)
    # Длину стрелки выбираем фиксированной или пропорциональной dist
    arrow_len = min(50, dist * 0.3)
    # arrow_len = dist
    nose_end = (
        p_from[0] + arrow_len * math.sin(math.radians(nav["TA"])),
        p_from[1] + arrow_len * math.cos(math.radians(nav["TA"]))
    )
    
    return {
        "p_from": p_from, 
        "p_to": p_to,
        "TA": nav["TA"],           # курс (нос)
        "TC": nav["TC"],           # путевой угол
        "DA": nav["DA"],           # угол сноса
        "GS": GS,                  # путевая скорость
        "time_move": time_move,    # чистое время в движении
        "time_total": time_total,  # с учётом hover
        "nose_end": nose_end,      # для отрисовки стрелки курса
        # Опционально: для отладки
        "wind_speed": wind_speed,
        "wind_dir_deg": wind_dir_deg,
        "TAS": v_drone,
    }

def compensate_route(
    route: list,
    v: float,
    wind_speed: float,
    wind_dir_deg: float,
    t_js: float = 5.0,
) -> list:
    """
    Применяет коррекцию ветра ко всем сегментам маршрута.
    Возвращает список сегментов с данными для визуализации и расчёта времени.
    
    route — список (x, y, t) с временными метками (t не используется здесь)
    """
    if not route or wind_speed < 1e-6:
        # Без ветра: курс совпадает с направлением на цель
        result = []
        for i in range(1, len(route)):
            p_from = route[i-1]
            p_to = route[i]
            is_last = (i == len(route) - 1)
            dist = math.hypot(p_to[0] - p_from[0], p_to[1] - p_from[1])
            # Без ветра: TA = TC = направление на цель
            TC = math.degrees(math.atan2(p_to[0] - p_from[0], p_to[1] - p_from[1])) % 360
            result.append({
                "p_from": p_from,
                "p_to": p_to,
                "TA": TC,
                "TC": TC,
                "DA": 0.0,
                "GS": v,
                "time_move": 1.5 * dist / v,
                "time_total": 1.5 * dist / v + (t_js if not is_last else 0.0),
                "nose_end": (
                    p_from[0] + min(50, dist * 0.3) * math.sin(math.radians(TC)),
                    p_from[1] + min(50, dist * 0.3) * math.cos(math.radians(TC))
                ),
            })
        return result
    
    result = []
    for i in range(1, len(route)):
        p_from = route[i-1]
        p_to = route[i]
        is_last = (i == len(route) - 1)
        
        seg = segment_with_wind(
            p_from, p_to, v, wind_speed, wind_dir_deg, t_js, is_hover=not is_last
        )

        if seg is None:
            # Если ветер слишком сильный — возвращаем None для этого сегмента
            return None
        result.append(seg)
    
    return result

# Маршрут 
def time_between_with_wind(p_from, p_to, v, wind_speed, wind_dir_deg, t_js=5.0, hover=True):
    """Время перемещения между точками с учётом ветра"""
    nav = navigation_triangle(p_from, p_to, v, wind_speed, wind_dir_deg)

    if nav is None:
        return float('inf')  # невозможно лететь
    
    dist = math.hypot(p_to[0] - p_from[0], p_to[1] - p_from[1])
    GS = nav["GS"]
    
    if abs(GS) < 1e-6: 
        return float('inf')
    
    t_move = 1.5 * dist / GS
    return t_move + (t_js if hover else 0.0)

def time_between(p_from, p_to, v, t_js=5.0, hover=True):
    """Время перемещения между точками"""
    l = math.hypot(p_to[0] - p_from[0], p_to[1] - p_from[1])
    t_move = 1.5 * l / v
    return t_move + (t_js if hover else 0.0)

def make_time_func_with_wind(v, wind_speed, wind_dir_deg, t_js):
    """
    Возвращает функцию времени, которая "запоминает" параметры ветра.
    """
    def time_func(p_from, p_to, *args, **kwargs):
        # args содержит (v, t_js, hover) в позиционном виде
        # Извлекаем hover: если есть args[2] — это hover, иначе из kwargs
        if len(args) >= 3:
            hover = args[2]
        else:
            hover = kwargs.get('hover', True)
        return time_between_with_wind(p_from, p_to, v, wind_speed, wind_dir_deg, t_js, hover)
    return time_func

def session_time(route, v, t_js=5.0, time_func=time_between):
    """Общее время маршрута"""
    total = 0.0
    for i in range(len(route) - 1):
        hover = not ((i + 1) == (len(route) - 1))
        total += time_func(route[i], route[i + 1], v, t_js, hover)
    return total


def recalculate_times(route, v, t_js=5.0, time_func=time_between):
    """
    Пересчитывает временны́е метки в маршруте после 2-opt.
    route — список (x, y, t), где t будет перезаписан.
    Первая точка — база, время = 0.
    """
    if not route:
        return route

    result = [(route[0][0], route[0][1], 0.0)]
    current_time = 0.0

    for i in range(1, len(route)):
        prev = result[i - 1]
        curr = route[i]
        is_last = (i == len(route) - 1)
        t_step = time_func(prev, curr, v=v, t_js=t_js, hover=not is_last)
        current_time += t_step
        result.append((curr[0], curr[1], current_time))

    return result


def two_opt_optimize(route, v, t_js=5.0, time_func=time_between):
    """2-opt оптимизация маршрута"""
    if len(route) <= 3:
        route = recalculate_times(route, v, t_js, time_func)
        return route, session_time(route, v, t_js, time_func)

    best_route = route[:]
    best_time = session_time(best_route, v, t_js, time_func)

    improved = True
    while improved:
        improved = False
        n = len(best_route)
        for i in range(1, n - 2):
            for j in range(i + 1, n - 1):
                if j == i + 1:
                    continue
                new_route = (
                    best_route[:i + 1]
                    + best_route[i + 1:j + 1][::-1]
                    + best_route[j + 1:]
                )
                new_time = session_time(new_route, v, t_js, time_func)
                if new_time < best_time:
                    best_route = new_route
                    best_time = new_time
                    improved = True
                    break
            if improved:
                break

    best_route = recalculate_times(best_route, v, t_js, time_func)
    return best_route, best_time


# Таксоны
def build_taxons(
    L,
    H,
    points,
    v_min=1.5,
    t_ak=1800.0,
    t_js=5.0,
    initial_base_y=0.0,
    wind_speed=0.0,
    wind_dir_deg=0.0,
    wind_resistance=0.0,
    is_use_weather=False
):
    """
    Построение таксонов с опциональной коррекцией ветра.

    Параметры:
        L, H             — размеры области (м)
        points           — список точек съёмки (x, y)
        v_min            — скорость дрона (м/с)
        t_ak             — время аккумулятора (с)
        t_js             — время висения в точке (с)
        initial_base_y   — начальная Y-координата базы
        wind_speed       — скорость ветра (м/с), 0 = без ветра
        wind_dir_deg     — направление ветра, откуда дует (градусы)
        wind_resistance  — максимальная сопротивляемость дрона ветру (м/с)

    Возвращает словарь:
        {
            "N_k": int,
            "B": [ { "base", "points", "flight_points", "time_sec",
                     "route", "route_compensated" }, ... ],
            "C": [ недостижимые точки ],
            "error": str | None,
        }
    """

    use_wind = wind_speed > 1e-6 and is_use_weather

    v = v_min
    N_k = len(points)

    points_sorted = sorted(points, key=lambda pt: pt[0])

    visited = set()
    B = []
    C = []

    while len(visited) < N_k:
        for i, pt in enumerate(points_sorted):
            if i in visited:
                continue

            base_x, base_y = pt[0], initial_base_y
            route = [(base_x, base_y, 0)]
            current_time = 0.0

            if use_wind: 
                t_to_pt = time_between_with_wind((base_x, base_y), pt, v, wind_speed, wind_dir_deg, t_js, hover=True)
                t_back = time_between_with_wind(pt, (base_x, base_y), v, wind_speed, wind_dir_deg, t_js, hover=False)
                 
                if t_to_pt == float('inf') or t_back == float('inf'):
                    continue  
            else:
                t_to_pt = time_between((base_x, base_y), pt, v=v, t_js=t_js, hover=True)
                t_back = time_between(pt, (base_x, base_y), v=v, t_js=t_js, hover=False)

            t_direct = t_to_pt + t_back

            if t_direct <= t_ak:
                visited.add(i)
                current_time += t_to_pt
                route.append((pt[0], pt[1], current_time))

                # Жадный алгоритм
                while len(visited) < N_k:
                    best_i = None
                    best_t = float("inf")

                    for j, cand in enumerate(points_sorted):
                        if j in visited:
                            continue

                        if use_wind:
                            t_to = time_between_with_wind(route[-1], cand, v, wind_speed, wind_dir_deg, t_js, hover=True)
                            t_back_cand = time_between_with_wind(
                                cand, (base_x, base_y), v, wind_speed, wind_dir_deg, t_js, hover=False
                            )

                            if t_to == float('inf') or t_back_cand == float('inf'):
                                continue
                        else:
                            t_to = time_between(route[-1], cand, v=v, t_js=t_js, hover=True)
                            t_back_cand = time_between(
                                cand, (base_x, base_y), v=v, t_js=t_js, hover=False
                            )

                        if current_time + t_to + t_back_cand <= t_ak:
                            if t_to < best_t:
                                best_t = t_to
                                best_i = j

                    if best_i is None:
                        break

                    route.append((*points_sorted[best_i], current_time + best_t))
                    current_time += best_t
                    visited.add(best_i)

                # Возврат на базу
                if len(route) > 1:
                    if use_wind:
                        t_back_final = time_between_with_wind(
                            route[-1], (base_x, base_y), v, wind_speed, wind_dir_deg, t_js, hover=False
                        )
                    else: 
                        t_back_final = time_between(
                            route[-1], (base_x, base_y), v, t_js, hover=False
                        )

                    route.append((base_x, base_y, current_time + t_back_final))
                    current_time += t_back_final

                # 2-opt оптимизация
                time_func = time_between
                if use_wind:
                    time_func = make_time_func_with_wind(v, wind_speed, wind_dir_deg, t_js)

                route_opt, time_opt = two_opt_optimize(route, v, t_js, time_func)

                trajectory = {
                    "base": (base_x, base_y),
                    "points": route_opt[1:-1], # целевые точки съёмки
                    "time_sec": time_opt,
                    "route": route_opt,
                }

                if use_wind:
                    # Получаем данные по сегментам для отрисовки
                    segments_data = compensate_route(
                        route_opt, v, wind_speed, wind_dir_deg, t_js
                    )
                    
                    trajectory["wind"] = {
                        "speed": wind_speed,
                        "dir_deg": wind_dir_deg,   # откуда дует
                        "TAS": v,
                    }

                    trajectory["segments"] = segments_data

                B.append(trajectory)
                break

        else:
            for i, pt in enumerate(points_sorted):
                if i not in visited:
                    C.append(pt)
            break

    return {"N_k": len(B), "B": B, "C": C, "errors": None}

def build_taxons_big_density(
    L: float,  # ширина области (м)
    H: float,  # высота области (м)
    n_cols: float,  # количество столбцов (может быть дробным)
    n_rows: float,  # количество строк (может быть дробным)
    points: list[tuple[float, float]],  # исходные точки съёмки
    v_min: float = 1.5,
    t_ak: float = 1800.0,
    t_js: float = 5.0,
    initial_base_y: float = 0.0,
    wind_speed: float = 0.0,
    wind_dir_deg: float = 0.0,
    wind_resistance: float = 0.0,
    is_use_weather: bool = False
) -> dict:
    """
    Построение таксонов для большой плотности точек.
    
    Поддержка дробных n_cols/n_rows: последние кадры по краям обрезаются,
    но точки в них учитываются, и центры кадров вычисляются геометрически.
    """
    
    use_wind = wind_speed > 1e-6 and is_use_weather
    
    # Количество целых кадров
    n_cols_int = int(n_cols)
    n_rows_int = int(n_rows)
    
    # Дробные части (размеры последних неполных кадров)
    frac_cols = n_cols - n_cols_int
    frac_rows = n_rows - n_rows_int
    
    # Размеры полных кадров
    full_frame_width = L / n_cols if n_cols > 0 else 0
    full_frame_height = H / n_rows if n_rows > 0 else 0
    
    # Размеры последних (обрезанных) кадров
    last_frame_width = full_frame_width * frac_cols if frac_cols > 0 else full_frame_width
    last_frame_height = full_frame_height * frac_rows if frac_rows > 0 else full_frame_height
    
    def get_frame_bounds(col: int, row: int) -> tuple[float, float, float, float]:
        """
        Возвращает границы кадра (x_min, y_min, x_max, y_max)
        Учитывает, что последние кадры могут быть обрезаны
        """
        # Ширина текущего кадра
        if col == n_cols_int and frac_cols > 0:
            # Последний столбец (обрезанный)
            width = last_frame_width
        else:
            width = full_frame_width
        
        # Высота текущего кадра
        if row == n_rows_int and frac_rows > 0:
            # Последняя строка (обрезанная)
            height = last_frame_height
        else:
            height = full_frame_height
        
        x_min = col * full_frame_width
        y_min = row * full_frame_height
        x_max = x_min + width
        y_max = y_min + height
        
        return (x_min, y_min, x_max, y_max)
    
    def get_frame_index(x: float, y: float) -> tuple[int, int]:
        """
        Определяет индекс кадра для точки.
        Учитывает обрезанные краевые кадры.
        """
        # Определяем столбец
        if x >= n_cols_int * full_frame_width and frac_cols > 0:
            #  последнем обрезанном столбце
            col = n_cols_int
        else:
            col = int(x / full_frame_width) if full_frame_width > 0 else 0
        
        # Определяем строку
        if y >= n_rows_int * full_frame_height and frac_rows > 0:
            #  последней обрезанной строке
            row = n_rows_int
        else:
            row = int(y / full_frame_height) if full_frame_height > 0 else 0
        
        # Ограничиваем индексы
        max_col = n_cols_int if frac_cols == 0 else n_cols_int
        max_row = n_rows_int if frac_rows == 0 else n_rows_int
        
        col = max(0, min(col, max_col))
        row = max(0, min(row, max_row))
        
        return (col, row)
    
    def get_frame_center(col: int, row: int) -> tuple[float, float]:
        """
        Возвращает геометрический центр кадра (x, y)
        Учитывает обрезанные краевые кадры
        """
        x_min, y_min, x_max, y_max = get_frame_bounds(col, row)
        center_x = (x_min + x_max) / 2
        center_y = (y_min + y_max) / 2
        return (center_x, center_y)
    
    # Определяем все возможные кадры
    all_frames = {}
    
    # Количество кадров (включая обрезанные)
    n_cols_total = n_cols_int + (1 if frac_cols > 0 else 0)
    n_rows_total = n_rows_int + (1 if frac_rows > 0 else 0)
    
    for col in range(n_cols_total):
        for row in range(n_rows_total):
            x_min, y_min, x_max, y_max = get_frame_bounds(col, row)
            
            # Проверяем, существует ли кадр (имеет положительные размеры)
            if x_max <= x_min or y_max <= y_min:
                continue
            
            # Проверяем, является ли кадр полным (стандартного размера)
            is_full = (abs(x_max - x_min - full_frame_width) < 1e-6 and 
                      abs(y_max - y_min - full_frame_height) < 1e-6)
            
            # Геометрический центр кадра
            center = get_frame_center(col, row)
            
            all_frames[(col, row)] = {
                "bounds": (x_min, y_min, x_max, y_max),
                "center": center,
                "is_full": is_full,
                "points": []
            }
    
    # Распределяем точки по кадрам
    points_outside = []  # точки за пределами всех кадров
    for point in points:
        frame_idx = get_frame_index(point[0], point[1])
        
        # Проверяем, попадает ли точка в границы кадра
        if frame_idx in all_frames:
            bounds = all_frames[frame_idx]["bounds"]
            x_min, y_min, x_max, y_max = bounds
            
            # Проверяем, действительно ли точка внутри этого кадра
            if x_min <= point[0] <= x_max and y_min <= point[1] <= y_max:
                all_frames[frame_idx]["points"].append(point)
            else:
                # Точка не попала в кадр из-за погрешностей
                points_outside.append(point)
        else:
            points_outside.append(point)
    
    # Формируем список кадров с точками
    frames_with_points = []
    for frame_idx, frame_data in all_frames.items():
        if frame_data["points"]:
            pts = frame_data["points"]
            
            # Вычисляем центр масс
            cm_x = sum(p[0] for p in pts) / len(pts)
            cm_y = sum(p[1] for p in pts) / len(pts)
            center_of_mass = (cm_x, cm_y)

            frames_with_points.append({
                "frame_id": frame_idx,
                "bounds": frame_data["bounds"],
                "center": center_of_mass,  # Используем центр масс вместо геометрического центра
                "points": pts,
                "point_count": len(pts),
                "is_full": frame_data["is_full"]
            })
    
    # Если нет ни одного кадра с точками
    if not frames_with_points:
        return {
            "N_k": 0,
            "B": [],
            "C": points,
            "frame_info": {
                "n_cols": n_cols,
                "n_rows": n_rows,
                "frame_width": full_frame_width,
                "frame_height": full_frame_height,
                "last_frame_width": last_frame_width,
                "last_frame_height": last_frame_height,
                "bounds": {"x_min": 0, "x_max": L, "y_min": 0, "y_max": H},
                "frames_with_points": []
            },
            "errors": "No frames with points found"
        }
    
    # ============================================================
    # 2. ПОСТРОЕНИЕ ТАКСОНОВ ПО ЦЕНТРАМ КАДРОВ
    # ============================================================
    
    # Извлекаем геометрические центры кадров
    frame_centers = [frame["center"] for frame in frames_with_points]
    
    # Сортируем центры по X для жадного алгоритма
    frame_centers_sorted = sorted(frame_centers, key=lambda pt: pt[0])
    
    # Создаём маппинг центра -> информация о кадре
    center_to_frame = {frame["center"]: frame for frame in frames_with_points}
    
    v = v_min
    n_frames = len(frame_centers_sorted)
    visited_frames = set()
    taxons = []
    unreachable_points = []
    
    while len(visited_frames) < n_frames:
        taxon_created = False
        
        for i, frame_center in enumerate(frame_centers_sorted):
            if i in visited_frames:
                continue
            
            # База располагается под центром кадра
            base_x, base_y = frame_center[0], initial_base_y
            route = [(base_x, base_y, 0.0)]
            current_time = 0.0
            
            # Проверяем возможность долететь и вернуться
            if use_wind:
                t_to = time_between_with_wind((base_x, base_y), frame_center, v, wind_speed, wind_dir_deg, t_js, hover=True)
                t_back = time_between_with_wind(frame_center, (base_x, base_y), v, wind_speed, wind_dir_deg, t_js, hover=False)
                if t_to == float('inf') or t_back == float('inf'):
                    continue
            else:
                t_to = time_between((base_x, base_y), frame_center, v, t_js, hover=True)
                t_back = time_between(frame_center, (base_x, base_y), v, t_js, hover=False)
            
            if t_to + t_back <= t_ak:
                visited_frames.add(i)
                current_time += t_to
                route.append((frame_center[0], frame_center[1], current_time))
                
                # Жадное добавление дополнительных кадров
                while len(visited_frames) < n_frames:
                    best_idx = None
                    best_time = float("inf")
                    
                    for j, candidate_center in enumerate(frame_centers_sorted):
                        if j in visited_frames:
                            continue
                        
                        last_point = (route[-1][0], route[-1][1])
                        
                        if use_wind:
                            t_add = time_between_with_wind(last_point, candidate_center, v, wind_speed, wind_dir_deg, t_js, hover=True)
                            t_return = time_between_with_wind(candidate_center, (base_x, base_y), v, wind_speed, wind_dir_deg, t_js, hover=False)
                            if t_add == float('inf') or t_return == float('inf'):
                                continue
                        else:
                            t_add = time_between(last_point, candidate_center, v, t_js, hover=True)
                            t_return = time_between(candidate_center, (base_x, base_y), v, t_js, hover=False)
                        
                        if current_time + t_add + t_return <= t_ak:
                            if t_add < best_time:
                                best_time = t_add
                                best_idx = j
                    
                    if best_idx is None:
                        break
                    
                    center_to_add = frame_centers_sorted[best_idx]
                    route.append((center_to_add[0], center_to_add[1], current_time + best_time))
                    current_time += best_time
                    visited_frames.add(best_idx)
                
                # Возврат на базу
                if len(route) > 1:
                    last_point = (route[-1][0], route[-1][1])
                    if use_wind:
                        t_return = time_between_with_wind(last_point, (base_x, base_y), v, wind_speed, wind_dir_deg, t_js, hover=False)
                    else:
                        t_return = time_between(last_point, (base_x, base_y), v, t_js, hover=False)
                    
                    route.append((base_x, base_y, current_time + t_return))
                    current_time += t_return
                
                # 2-opt оптимизация
                time_func = make_time_func_with_wind(v, wind_speed, wind_dir_deg, t_js) if use_wind else time_between
                route_opt, time_opt = two_opt_optimize(route, v, t_js, time_func)
                
                # Собираем все исходные точки из кадров этого таксона
                all_points_in_taxon = []
                frames_in_taxon = []
                
                for point_on_route in route_opt[1:-1]:
                    center = (point_on_route[0], point_on_route[1])
                    if center in center_to_frame:
                        frame_info = center_to_frame[center]
                        all_points_in_taxon.extend(frame_info["points"])
                        frames_in_taxon.append({
                            "frame_id": frame_info["frame_id"],
                            "center": center,
                            "bounds": frame_info["bounds"],
                            "point_count": frame_info["point_count"],
                            "arrival_time": point_on_route[2]
                        })

                # Центры кадров в порядке обхода (без времени)
                ordered_frame_centers = [
                    (frame_center[0], frame_center[1])
                    for frame_center in route_opt[1:-1]
                ]

                # Формируем результат
                trajectory = {
                    "base": (base_x, base_y),
                    "frames": route_opt[1:-1],
                    "frames_detail": frames_in_taxon,
                    "points": ordered_frame_centers,  # центры кадров в порядке обхода
                    "original_points": all_points_in_taxon,  # исходные точки
                    "time_sec": time_opt,
                    "route": route_opt,
                }
                
                if use_wind:
                    segments_data = compensate_route(route_opt, v, wind_speed, wind_dir_deg, t_js)
                    trajectory["wind"] = {
                        "speed": wind_speed,
                        "dir_deg": wind_dir_deg,
                        "TAS": v,
                    }
                    trajectory["segments"] = segments_data
                
                taxons.append(trajectory)
                taxon_created = True
                break
        
        if not taxon_created:
            # Оставшиеся кадры недостижимы
            for i, frame_center in enumerate(frame_centers_sorted):
                if i not in visited_frames:
                    frame_info = center_to_frame[frame_center]
                    unreachable_points.extend(frame_info["points"])
            break
    
    # Добавляем точки, которые не попали ни в один кадр
    unreachable_points.extend(points_outside)
    
    # Формируем информацию о кадрах
    frame_info = {
        "n_cols": n_cols,
        "n_rows": n_rows,
        "n_cols_int": n_cols_int,
        "n_rows_int": n_rows_int,
        "frame_width": full_frame_width,
        "frame_height": full_frame_height,
        "last_frame_width": last_frame_width,
        "last_frame_height": last_frame_height,
        "bounds": {"x_min": 0, "x_max": L, "y_min": 0, "y_max": H},
        "frames_with_points": frames_with_points
    }
    
    return {
        "N_k": len(taxons),
        "B": taxons,
        "C": unreachable_points,
        "frame_info": frame_info,
        "errors": None
    }


def build_taxons_hybrid(
    L: float,
    H: float,
    n_cols: float,
    n_rows: float,
    points: list[tuple[float, float]],
    v_min: float = 1.5,
    t_ak: float = 1800.0,
    t_js: float = 5.0,
    initial_base_y: float = 0.0,
    wind_speed: float = 0.0,
    wind_dir_deg: float = 0.0,
    wind_resistance: float = 0.0,
    is_use_weather: bool = False,
    density_k: float = 0.5  # коэффициент при сигме: порог = mean + k*std
) -> dict:
    """
    Комбинированный метод построения таксонов.
    
    Алгоритм:
    1. Разбиваем область на сетку n_cols x n_rows.
    2. Распределяем точки по ячейкам.
    3. Для каждой непустой ячейки считаем плотность = N_points / area.
    4. Автоматически определяем пороговую плотность:
           threshold = mean(densities) + density_k * std(densities)
       где densities — плотности непустых ячеек.
    5. Если плотность ячейки >= threshold -> заменяем её точки на ЦЕНТР ТЯЖЕСТИ
       (среднее координат точек в ячейке).
       Иначе -> оставляем все точки как есть.
    6. К полученному набору точек применяем метод 1 (жадный алгоритм + 2-opt).
    """
    
    use_wind = wind_speed > 1e-6 and is_use_weather
    
    # 1 Построение сетки
    
    n_cols_int = int(n_cols)
    n_rows_int = int(n_rows)
    
    frac_cols = n_cols - n_cols_int
    frac_rows = n_rows - n_rows_int
    
    full_frame_width = L / n_cols if n_cols > 0 else 0
    full_frame_height = H / n_rows if n_rows > 0 else 0
    
    last_frame_width = full_frame_width * frac_cols if frac_cols > 0 else full_frame_width
    last_frame_height = full_frame_height * frac_rows if frac_rows > 0 else full_frame_height
    
    def get_frame_bounds(col: int, row: int) -> tuple[float, float, float, float]:
        width = last_frame_width if (col == n_cols_int and frac_cols > 0) else full_frame_width
        height = last_frame_height if (row == n_rows_int and frac_rows > 0) else full_frame_height
        x_min = col * full_frame_width
        y_min = row * full_frame_height
        return (x_min, y_min, x_min + width, y_min + height)
    
    # Определяем все ячейки
    n_cols_total = n_cols_int + (1 if frac_cols > 0 else 0)
    n_rows_total = n_rows_int + (1 if frac_rows > 0 else 0)
    
    cells = {}
    for col in range(n_cols_total):
        for row in range(n_rows_total):
            x_min, y_min, x_max, y_max = get_frame_bounds(col, row)
            if x_max <= x_min or y_max <= y_min:
                continue
 
            area = (x_max - x_min) * (y_max - y_min)
            cells[(col, row)] = {
                "bounds": (x_min, y_min, x_max, y_max),
                "area": area,
                "points": [],
                "col": col,
                "row": row,
            }

    
    # Распределяем точки по ячейкам
    points_outside = []
    for point in points:
        x, y = point
 
        # Определяем столбец
        if x >= n_cols_int * full_frame_width and frac_cols > 0:
            col = n_cols_int
        else:
            col = int(x / full_frame_width) if full_frame_width > 0 else 0
 
        # Определяем строку
        if y >= n_rows_int * full_frame_height and frac_rows > 0:
            row = n_rows_int
        else:
            row = int(y / full_frame_height) if full_frame_height > 0 else 0
 
        col = max(0, min(col, n_cols_total - 1))
        row = max(0, min(row, n_rows_total - 1))
 
        if (col, row) in cells:
            bounds = cells[(col, row)]["bounds"]
            if bounds[0] <= x <= bounds[2] and bounds[1] <= y <= bounds[3]:
                cells[(col, row)]["points"].append(point)
            else:
                points_outside.append(point)
        else:
            points_outside.append(point)

    # 2. РАСЧЁТ ПЛОТНОСТЕЙ И АВТО-ПОРОГА
    # Плотности считаем для ВСЕХ ячеек (пустые имеют density = 0).
    # Но для расчёта порога используем только НЕПУСТЫЕ ячейки —
    # иначе много нулей искусственно занизят mean и std.
    for cell_data in cells.values():
        n_pts = len(cell_data["points"])
        area = cell_data["area"]
        cell_data["density"] = (n_pts / area) if area > 0 else 0.0
 
    nonempty_densities = [
        c["density"] for c in cells.values() if len(c["points"]) > 0
    ]
 
    if len(nonempty_densities) == 0:
        density_threshold = float("inf")
        density_mean = 0.0
        density_std = 0.0
    elif len(nonempty_densities) == 1:
        # Одна непустая ячейка — std не определён, считаем её плотной.
        density_mean = nonempty_densities[0]
        density_std = 0.0
        density_threshold = density_mean  # >= порога => плотная
    else:
        density_mean = sum(nonempty_densities) / len(nonempty_densities)
        variance = sum((d - density_mean) ** 2 for d in nonempty_densities) / len(nonempty_densities)
        density_std = math.sqrt(variance)
        sorted_d = sorted(nonempty_densities)
        n = len(sorted_d)  
        density_threshold = (sorted_d[n // 2] if n % 2 else (sorted_d[n // 2 - 1] + sorted_d[n // 2]) / 2)
        # density_threshold = density_mean + density_k * density_std
 
    # ============================================================
    # 3. ПРЕОБРАЗОВАНИЕ ТОЧЕК С УЧЁТОМ ПЛОТНОСТИ
    #    (центр тяжести вместо центра кадра)
    # ============================================================
 
    transformed_points = []
    cells_info = []
 
    for cell_id, cell_data in cells.items():
        pts = cell_data["points"]
        point_count = len(pts)
 
        if point_count == 0:
            continue
 
        is_dense = (
            point_count >= 2  # один точкой не имеет смысла усреднять
            and cell_data["density"] >= density_threshold - 1e-12
        )

        # print(cell_data["density"], density_threshold)  
 
        if is_dense:
            # Центр тяжести: среднее координат точек ячейки
            cx = sum(p[0] for p in pts) / point_count
            cy = sum(p[1] for p in pts) / point_count
            centroid = (cx, cy)
 
            transformed_points.append(centroid)
            cells_info.append({
                "cell_id": cell_id,
                "type": "dense",
                "original_points": pts,
                "replaced_by": centroid,
                "point_count": point_count,
                "density": cell_data["density"],
            })
        else:
            # Разреженная ячейка: оставляем все точки как есть
            for pt in pts:
                transformed_points.append(pt)
            cells_info.append({
                "cell_id": cell_id,
                "type": "sparse",
                "points": pts,
                "point_count": point_count,
                "density": cell_data["density"],
            })
 
    # Точки, которые не попали ни в одну ячейку
    transformed_points.extend(points_outside)
 
    if not transformed_points:
        return {
            "N_k": 0,
            "B": [],
            "C": list(points),
            "method": "hybrid",
            "errors": "No points after transformation",
        }
 
    # ============================================================
    # 4. ПРИМЕНЯЕМ МЕТОД 1 К ПРЕОБРАЗОВАННОМУ НАБОРУ ТОЧЕК
    # ============================================================
 
    points_sorted = sorted(transformed_points, key=lambda pt: pt[0])
 
    visited = set()
    B = []
    C = []
    v = v_min
 
    while len(visited) < len(points_sorted):
        for i, pt in enumerate(points_sorted):
            if i in visited:
                continue
 
            base_x, base_y = pt[0], initial_base_y
            route = [(base_x, base_y, 0)]
            current_time = 0.0
 
            # Проверяем возможность долететь до точки и вернуться
            if use_wind:
                t_to_pt = time_between_with_wind((base_x, base_y), pt, v, wind_speed, wind_dir_deg, t_js, hover=True)
                t_back = time_between_with_wind(pt, (base_x, base_y), v, wind_speed, wind_dir_deg, t_js, hover=False)
                if t_to_pt == float('inf') or t_back == float('inf'):
                    continue
            else:
                t_to_pt = time_between((base_x, base_y), pt, v=v, t_js=t_js, hover=True)
                t_back = time_between(pt, (base_x, base_y), v=v, t_js=t_js, hover=False)
 
            t_direct = t_to_pt + t_back
 
            if t_direct <= t_ak:
                visited.add(i)
                current_time += t_to_pt
                route.append((pt[0], pt[1], current_time))
 
                # Жадный алгоритм
                while len(visited) < len(points_sorted):
                    best_i = None
                    best_t = float("inf")
 
                    for j, cand in enumerate(points_sorted):
                        if j in visited:
                            continue
 
                        if use_wind:
                            t_to = time_between_with_wind((route[-1][0], route[-1][1]), cand, v, wind_speed, wind_dir_deg, t_js, hover=True)
                            t_back_cand = time_between_with_wind(cand, (base_x, base_y), v, wind_speed, wind_dir_deg, t_js, hover=False)
                            if t_to == float('inf') or t_back_cand == float('inf'):
                                continue
                        else:
                            t_to = time_between((route[-1][0], route[-1][1]), cand, v=v, t_js=t_js, hover=True)
                            t_back_cand = time_between(cand, (base_x, base_y), v=v, t_js=t_js, hover=False)
 
                        if current_time + t_to + t_back_cand <= t_ak:
                            if t_to < best_t:
                                best_t = t_to
                                best_i = j
 
                    if best_i is None:
                        break
 
                    cand_pt = points_sorted[best_i]
                    route.append((cand_pt[0], cand_pt[1], current_time + best_t))
                    current_time += best_t
                    visited.add(best_i)
 
                # Возврат на базу
                if len(route) > 1:
                    if use_wind:
                        t_back_final = time_between_with_wind((route[-1][0], route[-1][1]), (base_x, base_y), v, wind_speed, wind_dir_deg, t_js, hover=False)
                    else:
                        t_back_final = time_between((route[-1][0], route[-1][1]), (base_x, base_y), v, t_js, hover=False)
 
                    route.append((base_x, base_y, current_time + t_back_final))
                    current_time += t_back_final
 
                # 2-opt оптимизация
                time_func = time_between
                if use_wind:
                    time_func = make_time_func_with_wind(v, wind_speed, wind_dir_deg, t_js)
 
                route_opt, time_opt = two_opt_optimize(route, v, t_js, time_func)
 
                # Собираем оригинальные точки для этого таксона
                original_points_in_taxon = []
                for point_on_route in route_opt[1:-1]:
                    point_xy = (point_on_route[0], point_on_route[1])
                    for cell_info in cells_info:
                        if cell_info["type"] == "dense" and cell_info["replaced_by"] == point_xy:
                            original_points_in_taxon.extend(cell_info["original_points"])
                            break
                        elif cell_info["type"] == "sparse" and point_xy in cell_info.get("points", []):
                            original_points_in_taxon.append(point_xy)
                            break
                    else:
                        if point_xy in points_outside:
                            original_points_in_taxon.append(point_xy)
 
                trajectory = {
                    "base": (base_x, base_y),
                    "points": route_opt[1:-1],
                    "original_points": original_points_in_taxon,
                    "time_sec": time_opt,
                    "route": route_opt,
                }
 
                if use_wind:
                    segments_data = compensate_route(route_opt, v, wind_speed, wind_dir_deg, t_js)
                    trajectory["wind"] = {
                        "speed": wind_speed,
                        "dir_deg": wind_dir_deg,
                        "TAS": v,
                    }
                    trajectory["segments"] = segments_data
 
                B.append(trajectory)
                break
 
        else:
            # Недостижимые точки
            for i, pt in enumerate(points_sorted):
                if i not in visited:
                    point_xy = (pt[0], pt[1])
                    for cell_info in cells_info:
                        if cell_info["type"] == "dense" and cell_info["replaced_by"] == point_xy:
                            C.extend(cell_info["original_points"])
                            break
                        elif cell_info["type"] == "sparse" and point_xy in cell_info.get("points", []):
                            C.append(point_xy)
                            break
                    else:
                        if point_xy in points_outside:
                            C.append(point_xy)
            break

    return {
        "N_k": len(B),
        "B": B,
        "C": C,
        "errors": None,
    }

def calculate_and_plot_density_heatmap(
    points: List[Tuple[float, float]],
    L: float,
    H: float,
    n_cols: float,
    n_rows: float,
    output_path: str = "density_heatmap.png",
    dpi: int = 100,
    density_k: float = 0.5,
    threshold_method: str = "mean_std",  # "mean_std" | "median"
    cmap: str = "Pastel1",
    show_points: bool = True,
) -> dict:
    """
    Строит тепловую карту плотности точек по сетке n_cols x n_rows и
    сохраняет её в файл `output_path`.
 
    Особенности:
    - Корректно работает с дробными n_cols / n_rows: крайние ячейки
      имеют меньший размер, и это отображается на карте честно
      (через pcolormesh с реальными координатами в метрах).
    - В каждой ячейке выводится численное значение плотности.
    - Плотные ячейки (density >= threshold) обводятся жирной чёрной рамкой.
    - Поверх карты опционально рисуются исходные точки (scatter).
    - Цветовая шкала (легенда) — справа.
 
    Возвращает словарь с рассчитанной статистикой (полезно для логирования).
    """
 
    # ------------------------------------------------------------
    # 1. ГЕОМЕТРИЯ СЕТКИ (с поддержкой дробных n_cols / n_rows)
    # ------------------------------------------------------------
    n_cols_int = int(n_cols)
    n_rows_int = int(n_rows)
    frac_cols = n_cols - n_cols_int
    frac_rows = n_rows - n_rows_int
 
    full_w = L / n_cols if n_cols > 0 else 0.0
    full_h = H / n_rows if n_rows > 0 else 0.0
 
    n_cols_total = n_cols_int + (1 if frac_cols > 0 else 0)
    n_rows_total = n_rows_int + (1 if frac_rows > 0 else 0)
 
    # Границы ячеек по осям (для pcolormesh нужны N+1 точек)
    x_edges = [i * full_w for i in range(n_cols_int + 1)]
    if frac_cols > 0:
        x_edges.append(x_edges[-1] + full_w * frac_cols)
 
    y_edges = [j * full_h for j in range(n_rows_int + 1)]
    if frac_rows > 0:
        y_edges.append(y_edges[-1] + full_h * frac_rows)
 
    x_edges_np = np.array(x_edges, dtype=float)
    y_edges_np = np.array(y_edges, dtype=float)
 
    # ------------------------------------------------------------
    # 2. РАСПРЕДЕЛЕНИЕ ТОЧЕК ПО ЯЧЕЙКАМ И РАСЧЁТ ПЛОТНОСТЕЙ
    # ------------------------------------------------------------
    counts = np.zeros((n_rows_total, n_cols_total), dtype=int)
 
    for x, y in points:
        if x < 0 or y < 0 or x > L or y > H:
            continue  # точка вне области — игнорируем для матрицы
 
        if x >= n_cols_int * full_w and frac_cols > 0:
            col = n_cols_int
        else:
            col = int(x / full_w) if full_w > 0 else 0
 
        if y >= n_rows_int * full_h and frac_rows > 0:
            row = n_rows_int
        else:
            row = int(y / full_h) if full_h > 0 else 0
 
        col = max(0, min(col, n_cols_total - 1))
        row = max(0, min(row, n_rows_total - 1))
        counts[row, col] += 1
 
    # Площади ячеек (могут различаться у крайних)
    areas = np.zeros((n_rows_total, n_cols_total), dtype=float)
    for r in range(n_rows_total):
        for c in range(n_cols_total):
            w = x_edges_np[c + 1] - x_edges_np[c]
            h = y_edges_np[r + 1] - y_edges_np[r]
            areas[r, c] = w * h
 
    density = np.where(areas > 0, counts / np.where(areas > 0, areas, 1), 0.0)
 
    # ------------------------------------------------------------
    # 3. РАСЧЁТ ПОРОГОВОЙ ПЛОТНОСТИ (по непустым ячейкам)
    # ------------------------------------------------------------
    nonempty = density[counts > 0]
 
    if nonempty.size == 0:
        density_threshold = float("inf")
        density_mean = 0.0
        density_std = 0.0
    elif nonempty.size == 1:
        density_mean = float(nonempty[0])
        density_std = 0.0
        density_threshold = density_mean
    else:
        if threshold_method == "median":
            density_mean = float(np.mean(nonempty))
            density_std = float(np.std(nonempty))
            density_threshold = float(np.median(nonempty))
        else:  # mean_std
            density_mean = float(np.mean(nonempty))
            density_std = float(np.std(nonempty))
            density_threshold = density_mean + density_k * density_std
 
    # ------------------------------------------------------------
    # 4. ОТРИСОВКА
    # ------------------------------------------------------------
    sns.set_theme(style="white")
 
    # Размер фигуры пропорционален реальной геометрии области,
    # но ограничиваем разумными пределами.
    aspect = H / L if L > 0 else 1.0
    base_w = 12.0
    fig_w = base_w
    fig_h = max(4.0, min(20.0, base_w * aspect + 1.5))  # +1.5 на заголовок/оси
 
    fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=dpi)
 
    # Тепловая карта через pcolormesh — честная геометрия
    mesh = ax.pcolormesh(
        x_edges_np,
        y_edges_np,
        density,
        cmap=cmap,
        shading="flat",
        edgecolors="white",
        linewidth=0.5,
    )
 
    # Аннотации в каждой ячейке: значение плотности
    # Выбираем формат: научная нотация если значения слишком мелкие/крупные
    max_d = density.max() if density.size else 0.0
    if max_d == 0:
        fmt = "{:.0f}"
    elif max_d < 0.01 or max_d >= 1000:
        fmt = "{:.2e}"
    elif max_d < 1:
        fmt = "{:.4f}"
    else:
        fmt = "{:.2f}"
 
    # Порог для выбора цвета текста — половина диапазона
    text_threshold = max_d * 0.5

    # Размер шрифта пропорционален размеру ячейки.
    # Ориентируемся на МИНИМАЛЬНУЮ ячейку (крайние тонкие при дробной сетке),
    # чтобы текст влез везде. Берём минимум по ширине и высоте.
    # fig_w_inch, fig_h_inch = fig.get_size_inches()
    # ax_bbox = ax.get_position()  # доля фигуры, занятая осями
    # ax_w_inch = fig_w_inch * ax_bbox.width
    # ax_h_inch = fig_h_inch * ax_bbox.height

    # min_cell_w_m = float(np.min(np.diff(x_edges_np)))
    # min_cell_h_m = float(np.min(np.diff(y_edges_np)))

    # # Размер ячейки в дюймах на фигуре
    # cell_w_inch = ax_w_inch * (min_cell_w_m / L)
    # cell_h_inch = ax_h_inch * (min_cell_h_m / H)

    # # Длина строки (в символах) — учитываем формат аннотации
    # sample_text = fmt.format(max_d if max_d > 0 else 0)
    # n_chars = max(len(sample_text), 4)

    # # Эмпирические коэффициенты:
    # #  - ширина символа ≈ 0.6 высоты шрифта (в pt) → font_pt = (cell_w_inch * 72) / (n_chars * 0.6)
    # #  - высота строки ≈ 1.2 размера шрифта     → font_pt = (cell_h_inch * 72) / 1.2
    # font_by_w = (cell_w_inch * 72) / (n_chars * 0.6)
    # font_by_h = (cell_h_inch * 72) / 1.5  # 1.5 даёт небольшой воздух
    # font_size = max(5.0, min(14.0, min(font_by_w, font_by_h)))

    fig_w_inch, fig_h_inch = fig.get_size_inches()

    # Размер ячейки на КАРТИНКЕ в дюймах (а не в метрах!).
    # В дробях фигуры: ширина одной ячейки = (доля осей по X) / n_cols_total
    ax_bbox = ax.get_position()
    ax_w_inch = fig_w_inch * ax_bbox.width
    ax_h_inch = fig_h_inch * ax_bbox.height

    cell_w_inch = ax_w_inch / n_cols_total
    cell_h_inch = ax_h_inch / n_rows_total

    sample_text = fmt.format(max_d if max_d > 0 else 0)
    n_chars = max(len(sample_text), 4)

    font_by_w = (cell_w_inch * 72) / (n_chars * 0.6)
    font_by_h = (cell_h_inch * 72) / 1.5
    font_size = max(5.0, min(14.0, min(font_by_w, font_by_h)))

    for r in range(n_rows_total):
        for c in range(n_cols_total):
            cx = (x_edges_np[c] + x_edges_np[c + 1]) / 2
            cy = (y_edges_np[r] + y_edges_np[r + 1]) / 2
            val = density[r, c]
            text_color = "white" if val > text_threshold else "black"
            ax.text(
                cx, cy,
                fmt.format(val),
                ha="center", va="center",
                fontsize=font_size,
                color="black",
                fontweight="bold" if counts[r, c] > 0 else "normal",
            )
 
    # Рамки вокруг плотных ячеек
    for r in range(n_rows_total):
        for c in range(n_cols_total):
            if counts[r, c] >= 2 and density[r, c] >= (density_threshold - 1e-12):
                rect = mpatches.Rectangle(
                    (x_edges_np[c], y_edges_np[r]),
                    x_edges_np[c + 1] - x_edges_np[c],
                    y_edges_np[r + 1] - y_edges_np[r],
                    linewidth=2.5,
                    edgecolor="black",
                    facecolor="none",
                    zorder=5,
                )
                ax.add_patch(rect)
 
    # Точки поверх
    if show_points and points:
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        ax.scatter(
            xs, ys,
            s=18,
            c="blue",
            edgecolors="white",
            linewidths=0.7,
            zorder=10,
            alpha=0.85,
        )
 
    # Оси и заголовок
    ax.set_xlim(0, L)
    ax.set_ylim(0, H)
    ax.set_aspect("equal", adjustable="box")
    ax.set_xlabel("Ширина базового кадра, м", fontsize=11)
    ax.set_ylabel("Высота базового кадра, м", fontsize=11)
 
    threshold_label = (
        f"медиана = {density_threshold:.4g}"
        if threshold_method == "median"
        else f"mean + {density_k}·σ = {density_threshold:.4g}"
    )
    # ax.set_title(
    #     f"Тепловая карта плотности точек\n"
    #     f"Сетка {n_cols}×{n_rows}  •  точек: {len(points)}  •  порог: {threshold_label}",
    #     fontsize=12,
    #     pad=12,
    # )
 
    # Колорбар (легенда)
    # cbar = fig.colorbar(mesh, ax=ax, fraction=0.046, pad=0.02)
    from mpl_toolkits.axes_grid1 import make_axes_locatable

    divider = make_axes_locatable(ax)
    cax = divider.append_axes("right", size="3%", pad=0.3)
    cbar = fig.colorbar(mesh, cax=cax) 
    cbar.set_label("Плотность, точек/м²", fontsize=11)
 
    # Линия порога на колорбаре
    if math.isfinite(density_threshold) and max_d > 0:
        cbar.ax.axhline(density_threshold, color="black", linewidth=1.8)
        cbar.ax.text(
            1.5, density_threshold,
            "", # порог текст
            va="center", ha="left",
            fontsize=9, fontweight="bold",
            transform=cbar.ax.get_yaxis_transform(),
        ) 
 
    plt.tight_layout()
    fig.savefig(output_path, dpi=dpi, bbox_inches="tight", facecolor="white")
    plt.close(fig)
 
    return {
        "output_path": output_path,
        "density_matrix": density.tolist(),
        "counts_matrix": counts.tolist(),
        "n_cols_total": n_cols_total,
        "n_rows_total": n_rows_total,
        "density_mean": density_mean,
        "density_std": density_std,
        "density_threshold": density_threshold,
        "threshold_method": threshold_method,
        "nonempty_cells": int(nonempty.size),
        "dense_cells": int(np.sum((counts >= 2) & (density >= density_threshold))),
    }