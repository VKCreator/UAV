import math


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
    print(p_from, p_to)
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
            print("DA", sin_DA) 
            return None
    else:
        # угол сноса
        DA = math.degrees(math.asin(sin_DA))

    # курс летательного аппарата 
    TA = (TC - DA) % 360
 
    # путевая скорость
    GS = v_drone * math.cos(math.radians(DA)) + wind_speed * math.cos(math.radians(WA))
    print("in triangle", GS) 

    if GS <= 1e-6:
        return None
 
    print({"TC": TC, "NW": NW, "WA": WA, "DA": DA, "TA": TA, "GS": GS})
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
    print("IN TIME. nav", nav)

    if nav is None:
        return float('inf')  # невозможно лететь
    
    dist = math.hypot(p_to[0] - p_from[0], p_to[1] - p_from[1])
    GS = nav["GS"]
    
    print("IN TIME. GS", GS)

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
            frames_with_points.append({
                "frame_id": frame_idx,
                "bounds": frame_data["bounds"],
                "center": frame_data["center"],
                "points": frame_data["points"],
                "point_count": len(frame_data["points"]),
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
    density_threshold: int = 2  # если точек >= threshold, заменяем на центр кадра
) -> dict:
    """
    Комбинированный метод построения таксонов.
    
    Алгоритм:
    1. Разбиваем область на сетку n_cols x n_rows
    2. Распределяем точки по ячейкам
    3. Если в ячейке точек >= density_threshold -> заменяем их на центр кадра
    4. Если в ячейке точек < density_threshold -> оставляем все точки как есть
    5. К полученному набору точек применяем метод 1 (жадный алгоритм)
    """
    
    use_wind = wind_speed > 1e-6 and is_use_weather
    
    # ============================================================
    # 1. РАЗБИЕНИЕ НА СЕТКУ
    # ============================================================
    
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
    
    def get_frame_center(col: int, row: int) -> tuple[float, float]:
        x_min, y_min, x_max, y_max = get_frame_bounds(col, row)
        return ((x_min + x_max) / 2, (y_min + y_max) / 2)
    
    # Определяем все ячейки
    n_cols_total = n_cols_int + (1 if frac_cols > 0 else 0)
    n_rows_total = n_rows_int + (1 if frac_rows > 0 else 0)
    
    cells = {}
    for col in range(n_cols_total):
        for row in range(n_rows_total):
            x_min, y_min, x_max, y_max = get_frame_bounds(col, row)
            if x_max <= x_min or y_max <= y_min:
                continue
            
            cells[(col, row)] = {
                "bounds": (x_min, y_min, x_max, y_max),
                "center": get_frame_center(col, row),
                "points": [],
                "col": col,
                "row": row
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
    
    # ============================================================
    # 2. ПРЕОБРАЗОВАНИЕ ТОЧЕК В ЗАВИСИМОСТИ ОТ ПЛОТНОСТИ
    # ============================================================
    
    transformed_points = []
    cells_info = []
    
    for cell_id, cell_data in cells.items():
        point_count = len(cell_data["points"])
        
        if point_count == 0:
            continue
        
        if point_count >= density_threshold:
            # Плотная ячейка: заменяем все точки на центр кадра
            center = cell_data["center"]
            transformed_points.append(center)
            cells_info.append({
                "cell_id": cell_id,
                "type": "dense",
                "original_points": cell_data["points"],
                "replaced_by": center,
                "point_count": point_count
            })
        else:
            # Разреженная ячейка: оставляем все точки как есть
            for pt in cell_data["points"]:
                transformed_points.append(pt)
            cells_info.append({
                "cell_id": cell_id,
                "type": "sparse",
                "points": cell_data["points"],
                "point_count": point_count
            })
    
    # Добавляем точки, которые не попали ни в одну ячейку
    transformed_points.extend(points_outside)
    
    if not transformed_points:
        return {
            "N_k": 0,
            "B": [],
            "C": points,
            "method": "hybrid",
            "errors": "No points after transformation"
        }
    
    # ============================================================
    # 3. ПРИМЕНЯЕМ МЕТОД 1 К ПРЕОБРАЗОВАННОМУ НАБОРУ ТОЧЕК
    # ============================================================
    
    # Сортируем точки по X для жадного алгоритма
    points_sorted = sorted(transformed_points, key=lambda pt: pt[0])
    
    visited = set()
    B = []
    C = []
    v = v_min
    
    # Для отслеживания оригинальных точек в таксонах
    taxon_to_original_points = {}
    
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
                    # Ищем, откуда взялась эта точка
                    point_xy = (point_on_route[0], point_on_route[1])
                    for cell_info in cells_info:
                        if cell_info["type"] == "dense" and cell_info["replaced_by"] == point_xy:
                            original_points_in_taxon.extend(cell_info["original_points"])
                            break
                        elif cell_info["type"] == "sparse" and point_xy in cell_info.get("points", []):
                            original_points_in_taxon.append(point_xy)
                            break
                    else:
                        # Если точка из points_outside
                        if point_xy in points_outside:
                            original_points_in_taxon.append(point_xy)
                
                trajectory = {
                    "base": (base_x, base_y),
                    "points": route_opt[1:-1],  # преобразованные точки
                    "original_points": original_points_in_taxon,  # оригинальные точки съёмки
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
                    # Находим оригинальные точки для недостижимой преобразованной точки
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
    
    # Формируем статистику
    stats = {
        "total_cells": len(cells),
        "dense_cells": sum(1 for ci in cells_info if ci["type"] == "dense"),
        "sparse_cells": sum(1 for ci in cells_info if ci["type"] == "sparse"),
        "original_points": len(points),
        "transformed_points": len(transformed_points),
        "density_threshold": density_threshold
    }
    
    return {
        "N_k": len(B),
        "B": B,
        "C": C,
        "method": "hybrid",
        "statistics": stats,
        "errors": None
    }