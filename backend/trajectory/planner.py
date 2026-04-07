import math


errors = []

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

    # ветер сильнее воздушной скорости
    sin_DA = wind_speed * math.sin(math.radians(WA)) / v_drone
    # Защита от float погрешностей
    sin_DA = max(-1.0, min(1.0, sin_DA))

    if abs(sin_DA) >= 1.0:
        # Если строго 1 или -1, DA = ±90°
        if abs(sin_DA) - 1.0 < 1e-12:
            DA = 90.0 if sin_DA > 0 else -90.0
        else:
            return None
    else:
        DA = math.degrees(math.asin(sin_DA))

    # курс летательного аппарата
    TA = (TC - DA) % 360

    # угол между TAS и WS в треугольнике = 180 - WA, без DA
    # GS = math.sqrt(
    #     v_drone**2 + wind_speed**2
    #     - 2 * v_drone * wind_speed * math.cos(math.radians(180 - WA))
    # )

    GS = v_drone * math.cos(math.radians(DA)) + wind_speed * math.cos(math.radians(WA))

    return {"TC": TC, "NW": NW, "WA": WA, "DA": DA, "TA": TA, "GS": GS}

# Компенсация ветра
def compensate_wind(p_from, p_to, v_drone, wind_speed, wind_dir_deg):
    if wind_speed < 1e-6:
        return p_to[0], p_to[1]

    nav = navigation_triangle(p_from, p_to, v_drone, wind_speed, wind_dir_deg)
    print(nav)  
    if nav is None:
        errors.append(f"Из т. {p_from} в т. {p_to} не удалось построить навигационный треугольник. Ветер сильнее воздушной скорости. Увеличьте рабочую скорость БПЛА, измените маршрут или дождитесь изменения погоды.")
        return p_to[0], p_to[1]


    # Время полёта до цели
    GS = nav["GS"]
    if abs(GS) < 1e-6:
        errors.append("Путевая скорость равна нулю — БПЛА не может двигаться к цели")
        return p_to[0], p_to[1]

    dist_to_target = math.hypot(p_to[0] - p_from[0], p_to[1] - p_from[1])
    time_to_target = dist_to_target / GS

    air_distance = v_drone * time_to_target

    # Точка, куда смотрит нос (на расстоянии air_distance по курсу TA)
    TA_rad = math.radians(nav["TA"])
    target_in_air = (
        p_from[0] + air_distance * math.sin(TA_rad),
        p_from[1] + air_distance * math.cos(TA_rad)
    )

    # dist = math.hypot(p_to[0] - p_from[0], p_to[1] - p_from[1])

    # Направляем нос по курсу TA — ветер скомпенсирует снос
    # и дрон придёт по земле точно в p_to
    # TA_rad = math.radians(nav["TA"])
    # cx = p_from[0] + dist * math.sin(TA_rad)
    # cy = p_from[1] + dist * math.cos(TA_rad)

    # return cx, cy
    return target_in_air


# def compensate_wind(p_from, p_to, v_drone, wind_speed, wind_dir_deg, t_js=5.0, hover=True):
#     if wind_speed < 1e-6:
#         return p_to[0], p_to[1]

#     wx, wy = wind_components(wind_speed, wind_dir_deg)
#     tx, ty = p_to[0], p_to[1]
#     px, py = p_from[0], p_from[1]

#     nav = navigation_triangle(p_from, p_to, v_drone, wind_speed, wind_dir_deg)
#     if nav is None:
#         return tx, ty

#     dist = math.hypot(tx - px, ty - py)
#     # время по путевой скорости — это время от базы до целевой точки
#     t_move = 1.5 * dist / nav["GS"]

#     # за это время ветер снесёт на:
#     drift_x = wx * t_move
#     drift_y = wy * t_move

#     # значит вылететь надо из точки смещённой против сноса
#     cx = tx - drift_x
#     cy = ty - drift_y

#     return cx, cy

# def old compensate_wind(p_from, p_to, v_drone, wind_speed, wind_dir_deg, t_js=5.0, hover=True):
#     """
#     Возвращает скорректированную точку куда направить дрон
#     с учётом навигационного треугольника скоростей.
#     """
#     if wind_speed < 1e-6:
#         return p_to[0], p_to[1]

#     nav = navigation_triangle(p_from, p_to, v_drone, wind_speed, wind_dir_deg)
#     if nav is None:
#         return p_to[0], p_to[1]  # невозможно скомпенсировать

#     dist = math.hypot(p_to[0] - p_from[0], p_to[1] - p_from[1])

#     # Время полёта с путевой скоростью
#     t_move = 1.5 * dist / nav["GS"]

#     # Точка куда направить нос дрона (по курсу TA, не по TC)
#     TA_rad = math.radians(nav["TA"])
#     cx = p_from[0] + dist * math.sin(TA_rad)
#     cy = p_from[1] + dist * math.cos(TA_rad)

#     return cx, cy

def compensate_route(
    route: list,
    v: float,
    wind_speed: float,
    wind_dir_deg: float,
    t_js: float = 5.0,
) -> list:
    """
    Применяет коррекцию ветра ко всем точкам маршрута кроме базы.

    route  — список (x, y, t)
    Возвращает новый маршрут со скорректированными координатами. 
    Временны́е метки берутся из исходного маршрута без изменений.
    """
    if not route or wind_speed < 1e-6:
        return route

    result = [route[0]]  # база не корректируется

    for i in range(1, len(route)):
        p_from = route[i - 1]
        p_to = route[i]
        is_last = (i == len(route) - 1)

        cx, cy = compensate_wind(
            p_from=p_from,
            p_to=p_to,
            v_drone=v,
            wind_speed=wind_speed,
            wind_dir_deg=wind_dir_deg,
        )
        result.append((cx, cy, p_to[2]))

    return result


# Маршрут 

def time_between(p_from, p_to, v, t_js=5.0, hover=True):
    """Время перемещения между точками"""
    l = math.hypot(p_to[0] - p_from[0], p_to[1] - p_from[1])
    t_move = 1.5 * l / v
    return t_move + (t_js if hover else 0.0)


def session_time(route, v, t_js=5.0):
    """Общее время маршрута"""
    total = 0.0
    for i in range(len(route) - 1):
        hover = not ((i + 1) == (len(route) - 1))
        total += time_between(route[i], route[i + 1], v, t_js, hover)
    return total


def recalculate_times(route, v, t_js=5.0):
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


# ── Таксоны ──────────────────────────────────────────────────────────────────

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
    # wind_speed = 3.0
    # wind_dir_deg = 225
    # wind_resistance = 11

    # ── Проверка безопасности ────────────────────────────────────────────────
    # if wind_resistance > 0 and wind_speed > wind_resistance:
    #     return {
    #         "N_k": 0,
    #         "B": [],
    #         "C": list(points),
    #         "error": (
    #             f"Скорость ветра {wind_speed} м/с превышает "
    #             f"сопротивляемость дрона {wind_resistance} м/с. "
    #             f"Полёт невозможен."
    #         ), 
    #     }

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
                    t_back_final = time_between(
                        route[-1], (base_x, base_y), v=v, t_js=t_js, hover=False
                    )
                    route.append((base_x, base_y, current_time + t_back_final))
                    current_time += t_back_final

                # 2-opt оптимизация
                route_opt, time_opt = two_opt_optimize(route, v, t_js)

                # Коррекция ветра
                if use_wind:
                    route_compensated = compensate_route(
                        route_opt, v, wind_speed, wind_dir_deg, t_js
                    )
                else:
                    route_compensated = route_opt

                trajectory = {
                    "base": (base_x, base_y),
                    "points": route_opt[1:-1], # целевые точки съёмки
                    "time_sec": time_opt,
                    "route": route_opt,
                }

                if use_wind:
                    trajectory["flight_points"] = route_compensated[1:-1]
                    trajectory["route_compensated"] = recalculate_times(route_compensated, v, t_js)
                    trajectory["time_sec"] = session_time(route_compensated, v, t_js)


                B.append(trajectory)
                break

        else:
            for i, pt in enumerate(points_sorted):
                if i not in visited:
                    C.append(pt)
            break

    return {"N_k": len(B), "B": B, "C": C, "errors": errors}

# nav = navigation_triangle((5.64,0), (5.64,5.31), 5.0, 3.0, 90.0)
# print(nav)
 
# dist = math.hypot(0, 5.31)
# t_move = 1.5 * dist / nav["GS"]
# print(f"dist={dist}, GS={nav['GS']:.3f}, t_move={t_move:.3f}")
# print(f"снос X = {-3*math.sin(math.radians(90))*t_move:.3f}")
# print(f"снос Y = {-3*math.cos(math.radians(90))*t_move:.3f}")