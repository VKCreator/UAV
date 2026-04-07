import math


# ── Ветер ─────────────────────────────────────────────────────────────────────

def wind_components(wind_speed: float, wind_dir_deg: float) -> tuple:
    """
    Вектор сноса ветром (wx, wy).
    wind_dir_deg — откуда дует ветер (метеорологическое соглашение):
        0°  = с севера (сносит на юг, Y-)
        90° = с востока (сносит на запад, X-)
    """
    rad = math.radians(wind_dir_deg)
    wx = -wind_speed * math.sin(rad)
    wy = -wind_speed * math.cos(rad)
    return wx, wy


def navigation_triangle(
    p_from: tuple,
    p_to: tuple,
    v_drone: float,
    wind_speed: float,
    wind_dir_deg: float,
) -> dict | None:
    """
    Навигационный треугольник скоростей.

    wind_dir_deg — откуда дует ветер (метеорологический, 0° = с севера).

    Возвращает словарь с полями:
        TC  — путевой угол (track course), от севера по часовой
        NW  — навигационный ветер (откуда смотреть на ветер с борта)
        WA  — угол ветра (Wind Angle)
        DA  — угол сноса (Drift Angle), + вправо, − влево
        TA  — истинный курс дрона (True Airspeed heading)
        GS  — путевая скорость (Ground Speed, м/с)

    Возвращает None если ветер боковой настолько, что полёт невозможен
    (|wind_speed * sin(WA)| > v_drone).
    """
    dx = p_to[0] - p_from[0]
    dy = p_to[1] - p_from[1]

    # Путевой угол от севера (Y+), по часовой
    TC = math.degrees(math.atan2(dx, dy)) % 360

    # Навигационный ветер — направление КУДА дует ветер
    NW = (wind_dir_deg + 180) % 360

    # Угол ветра относительно курса
    WA = (NW - TC + 360) % 360

    # Угол сноса: sin(DA) = wind_speed * sin(WA) / v_drone
    sin_DA = wind_speed * math.sin(math.radians(WA)) / v_drone
    if abs(sin_DA) > 1.0:
        # Боковая составляющая ветра превышает скорость дрона — лететь невозможно
        return None

    DA = math.degrees(math.asin(sin_DA))

    # Истинный курс дрона (нос смотрит сюда)
    TA = (TC - DA) % 360

    # Путевая скорость через теорему косинусов
    # Угол при вершине v_drone в треугольнике (WA с поправкой на DA)
    angle = math.radians(180 - WA + DA)
    GS = math.sqrt(
        v_drone**2 + wind_speed**2
        - 2 * v_drone * wind_speed * math.cos(angle)
    )

    return {"TC": TC, "NW": NW, "WA": WA, "DA": DA, "TA": TA, "GS": GS}


# ── Проверка возможности полёта ───────────────────────────────────────────────

def can_fly_segment(
    p_from: tuple,
    p_to: tuple,
    v_drone: float,
    wind_speed: float,
    wind_dir_deg: float,
    wind_resistance: float = 0.0,
) -> bool:
    """
    Проверяет, может ли дрон пройти сегмент p_from → p_to.

    Два независимых условия:
      1. Геометрическое (навигационный треугольник):
         боковая составляющая ветра не должна превышать скорость дрона.
         |wind_speed * sin(WA)| <= v_drone

      2. Физическое (wind_resistance):
         результирующая нагрузка (боковой + встречный ветер) не должна
         превышать максимальную сопротивляемость дрона.
         Если wind_resistance == 0 — проверка не выполняется.
    """
    if wind_speed < 1e-6:
        return True

    dx = p_to[0] - p_from[0]
    dy = p_to[1] - p_from[1]
    TC = math.degrees(math.atan2(dx, dy)) % 360

    NW = (wind_dir_deg + 180) % 360
    WA_rad = math.radians((NW - TC + 360) % 360)

    # Боковая составляющая ветра
    cross = wind_speed * math.sin(WA_rad)

    # Встречная составляющая ветра (> 0 — встречный, < 0 — попутный)
    head = wind_speed * math.cos(WA_rad)

    # Условие 1: геометрическое
    if abs(cross) > v_drone:
        return False

    # Условие 2: физическое ограничение сопротивляемости
    if wind_resistance > 0:
        # Учитываем только нагрузку (встречный и боковой), попутный не мешает
        effective_load = math.hypot(abs(cross), max(0.0, head))
        if effective_load > wind_resistance:
            return False

    return True


# ── Компенсация ветра ─────────────────────────────────────────────────────────

def compensate_wind(
    p_from: tuple,
    p_to: tuple,
    v_drone: float,
    wind_speed: float,
    wind_dir_deg: float,
) -> tuple:
    """
    Возвращает точку (cx, cy) — куда направить нос дрона, чтобы
    при наличии ветра он прошёл по земле именно в p_to.

    Логика: навигационный треугольник даёт истинный курс TA.
    Дрон смотрит носом в направлении TA, ветер сносит его боком,
    результирующий вектор скорости относительно земли направлен в p_to.

    Если ветра нет или полёт невозможен (см. navigation_triangle) —
    возвращает исходную целевую точку p_to без изменений.
    """
    if wind_speed < 1e-6:
        return p_to[0], p_to[1]

    nav = navigation_triangle(p_from, p_to, v_drone, wind_speed, wind_dir_deg)
    if nav is None:
        # Полёт по этому сегменту невозможен — вернём цель как есть,
        # вызывающий код должен был проверить can_fly_segment заранее
        return p_to[0], p_to[1]

    dist = math.hypot(p_to[0] - p_from[0], p_to[1] - p_from[1])

    # Направляем нос по курсу TA (не по TC).
    # За время полёта ветер сместит дрон так, что по земле он придёт в p_to.
    TA_rad = math.radians(nav["TA"])
    cx = p_from[0] + dist * math.sin(TA_rad)
    cy = p_from[1] + dist * math.cos(TA_rad)

    return cx, cy


def compensate_route(
    route: list,
    v: float,
    wind_speed: float,
    wind_dir_deg: float,
    wind_resistance: float = 0.0,
    t_js: float = 5.0,
) -> tuple[list, list]:
    """
    Применяет коррекцию ветра ко всем точкам маршрута кроме базы.

    route  — список (x, y, t)
    v      — скорость дрона (м/с)

    Возвращает:
        compensated  — маршрут со скорректированными координатами
                       (временны́е метки из исходного маршрута сохраняются)
        unreachable  — список точек (x, y, t), до которых долететь нельзя
                       из-за ветра / сопротивляемости
    """
    if not route or wind_speed < 1e-6:
        return route, []

    compensated = [route[0]]  # база не корректируется
    unreachable = []

    for i in range(1, len(route)):
        p_from = route[i - 1]
        p_to = route[i]

        if not can_fly_segment(p_from, p_to, v, wind_speed, wind_dir_deg, wind_resistance):
            unreachable.append(p_to)
            # Пропускаем точку — не добавляем в скорректированный маршрут
            continue

        cx, cy = compensate_wind(p_from, p_to, v, wind_speed, wind_dir_deg)
        compensated.append((cx, cy, p_to[2]))

    return compensated, unreachable


# ── Маршрут ───────────────────────────────────────────────────────────────────

def time_between(p_from, p_to, v, t_js=5.0, hover=True):
    """Время перемещения между точками (с)"""
    l = math.hypot(p_to[0] - p_from[0], p_to[1] - p_from[1])
    t_move = 1.5 * l / v
    return t_move + (t_js if hover else 0.0)


def session_time(route, v, t_js=5.0):
    """Общее время маршрута (с)"""
    total = 0.0
    for i in range(len(route) - 1):
        hover = not ((i + 1) == (len(route) - 1))
        total += time_between(route[i], route[i + 1], v, t_js, hover)
    return total


def recalculate_times(route, v, t_js=5.0):
    """
    Пересчитывает временны́е метки маршрута.
    route — список (x, y, t). Первая точка — база, время = 0.
    """
    if not route:
        return route

    result = [(route[0][0], route[0][1], 0.0)]
    current_time = 0.0

    for i in range(1, len(route)):
        prev = result[i - 1]
        curr = route[i]
        is_last = (i == len(route) - 1)
        t_step = time_between(prev, curr, v=v, t_js=t_js, hover=not is_last)
        current_time += t_step
        result.append((curr[0], curr[1], current_time))

    return result


def two_opt_optimize(route, v, t_js=5.0):
    """2-opt оптимизация маршрута"""
    if len(route) <= 3:
        route = recalculate_times(route, v, t_js)
        return route, session_time(route, v, t_js)

    best_route = route[:]
    best_time = session_time(best_route, v, t_js)

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
                new_time = session_time(new_route, v, t_js)
                if new_time < best_time:
                    best_route = new_route
                    best_time = new_time
                    improved = True
                    break
            if improved:
                break

    best_route = recalculate_times(best_route, v, t_js)
    return best_route, best_time


# ── Таксоны ───────────────────────────────────────────────────────────────────

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
    is_use_weather=False,
):
    """
    Построение таксонов с опциональной коррекцией ветра.

    Параметры:
        L, H             — размеры области (м)
        points           — список точек съёмки [(x, y), ...]
        v_min            — скорость дрона (м/с)
        t_ak             — время аккумулятора (с)
        t_js             — время висения в точке (с)
        initial_base_y   — начальная Y-координата базы
        wind_speed       — скорость ветра (м/с), 0 = без ветра
        wind_dir_deg     — направление ветра, откуда дует (градусы, метеорол.)
        wind_resistance  — максимальная нагрузка ветром, которую держит дрон (м/с)
        is_use_weather   — применять ли коррекцию ветра

    Возвращает:
        {
            "N_k": int,                     — количество таксонов
            "B":  [ taxon_dict, ... ],      — таксоны
            "C":  [ (x, y), ... ],          — недостижимые точки
            "error": str | None,
        }

    Структура taxon_dict:
        "base"               — (x, y) базовая точка таксона
        "points"             — целевые точки съёмки (оптимизированный маршрут)
        "flight_points"      — куда реально посылать дрон (с поправкой на ветер)
        "time_sec"           — время маршрута (с)
        "route"              — полный маршрут (x, y, t), включая базу
        "route_compensated"  — маршрут с компенсацией ветра
        "unreachable"        — точки, до которых нельзя долететь из-за ветра
    """
    use_wind = is_use_weather and wind_speed > 1e-6

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
            base = (base_x, base_y)

            # Проверяем, можно ли вообще добраться до первой точки при текущем ветре
            if use_wind and not can_fly_segment(
                base, pt, v, wind_speed, wind_dir_deg, wind_resistance
            ):
                C.append(pt)
                visited.add(i)
                continue

            route = [(base_x, base_y, 0)]
            current_time = 0.0

            t_to_pt = time_between(base, pt, v=v, t_js=t_js, hover=True)
            t_back = time_between(pt, base, v=v, t_js=t_js, hover=False)
            t_direct = t_to_pt + t_back

            if t_direct <= t_ak:
                visited.add(i)
                current_time += t_to_pt
                route.append((pt[0], pt[1], current_time))

                # Жадный алгоритм набора точек в таксон
                while len(visited) < N_k:
                    best_i = None
                    best_t = float("inf")

                    for j, cand in enumerate(points_sorted):
                        if j in visited:
                            continue

                        # Проверяем достижимость следующего сегмента с учётом ветра
                        if use_wind and not can_fly_segment(
                            route[-1], cand, v, wind_speed, wind_dir_deg, wind_resistance
                        ):
                            continue

                        t_to = time_between(route[-1], cand, v=v, t_js=t_js, hover=True)
                        t_back_cand = time_between(
                            cand, base, v=v, t_js=t_js, hover=False
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
                    t_back_final = time_between(
                        route[-1], base, v=v, t_js=t_js, hover=False
                    )
                    route.append((base_x, base_y, current_time + t_back_final))
                    current_time += t_back_final

                # 2-opt оптимизация
                route_opt, time_opt = two_opt_optimize(route, v, t_js)

                # Коррекция ветра
                if use_wind:
                    route_compensated, unreachable = compensate_route(
                        route_opt, v, wind_speed, wind_dir_deg, wind_resistance, t_js
                    )
                    # Точки, ставшие недостижимыми после оптимизации — в C
                    C.extend([(p[0], p[1]) for p in unreachable])
                else:
                    route_compensated = route_opt
                    unreachable = []

                B.append({
                    "base": base,
                    "points": route_opt[1:-1],
                    "flight_points": route_compensated[1:-1],
                    "time_sec": time_opt,
                    "route": route_opt,
                    "route_compensated": route_compensated,
                    "unreachable": unreachable,
                })

                break

        else:
            # Все оставшиеся точки недостижимы
            for i, pt in enumerate(points_sorted):
                if i not in visited:
                    C.append(pt)
            break

    return {"N_k": len(B), "B": B, "C": C, "error": None}
