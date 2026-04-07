import math


def time_between(p_from, p_to, v, t_js=5.0, hover=True):
    """Время перемещения между точками"""
    l = math.hypot(p_to[0] - p_from[0], p_to[1] - p_from[1])
    t_move = 1.5 * l / v
    return t_move + (t_js if hover else 0.0)


def session_time(route, v, t_js=5.0):
    """Общее время маршрута"""
    total = 0.0
    for i in range(len(route) - 1):
        print(total)
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

    result = [(route[0][0], route[0][1], 0.0)]  # база, t=0
    current_time = 0.0

    for i in range(1, len(route)):
        prev = result[i - 1]
        curr = route[i]

        # Последняя точка — возврат на базу, hover=False
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

    print(best_time)

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

    # Пересчитываем временные метки по финальному порядку точек
    best_route = recalculate_times(best_route, v, t_js)

    return best_route, best_time


def build_taxons(L, H, points, v_min=1.5, t_ak=1800.0, t_js=5.0, initial_base_y=0.0):
    """
    Модифицированная функция построения таксонов.
    L, H - размеры области
    points - список (x, y)
    initial_base_y - начальная база по оси Y
    """
    print(initial_base_y)
    v = v_min
    N_k = len(points)  # Количество точек

    # Сортируем точки по X (слева направо)
    points_sorted = sorted(points, key=lambda pt: pt[0])

    visited = set()  # Для отслеживания посещенных точек
    B = []  # Список таксонов
    C = [] # Список недостижимых точек

    while len(visited) < N_k:
        # Ищем самую левую точку, которая ещё не посещена
        print(visited)
        for i, pt in enumerate(points_sorted):
            if i in visited:
                continue

            base_x, base_y = (
                pt[0],
                initial_base_y,
            )  # Новая база (точка по X, начальная Y)
            route = [(base_x, base_y, 0)]  # Начальный маршрут
            current_time = 0.0

            # Проверка достижимости точки
            # t_direct = time_between(
            #     (base_x, base_y), pt, v=v, t_js=t_js, hover=True
            # ) + time_between(pt, (base_x, base_y), v=v, t_js=t_js, hover=False)

            t_to_pt = time_between(
                (base_x, base_y), pt, v=v, t_js=t_js, hover=True
            )
            t_back = time_between(
                pt, (base_x, base_y), v=v, t_js=t_js, hover=False
            )
            t_direct = t_to_pt + t_back

            if t_direct <= t_ak:
                # Если точка достижима
                visited.add(i)  # Отмечаем точку как посещенную
                # current_time += t_direct
                current_time += t_to_pt
                route.append((pt[0], pt[1], current_time))

                # Строим таксон для этой точки
                taxon_points = [pt]

                # Жадный алгоритм для добавления других точек в маршрут
                while len(visited) < N_k:
                    best_i = None
                    best_t = float("inf")

                    for j, cand in enumerate(points_sorted):
                        if j in visited:
                            continue

                        # Вычисляем время для перемещения между точками
                        t_to = time_between(route[-1], cand, v=v, t_js=t_js, hover=True)
                        t_back = time_between(
                            cand, (base_x, base_y), v=v, t_js=t_js, hover=False
                        )

                        # Если время не превышает максимального, добавляем точку в маршрут
                        if current_time + t_to + t_back <= t_ak:
                            if t_to < best_t:
                                best_t = t_to
                                best_i = j

                    if best_i is None:
                        break  # Если не можем добавить больше точек, завершаем маршрут

                    # Добавляем найденную точку в маршрут
                    route.append((*points_sorted[best_i], current_time + best_t))
                    current_time += best_t
                    visited.add(best_i)

                # Завершаем таксон
                if len(route) > 1:
                    t_back = time_between(
                        route[-1], (base_x, base_y), v=v, t_js=t_js, hover=False
                    )
                    route.append((base_x, base_y, current_time + t_back))  # Возвращаемся в начальную точку
                    current_time += t_back

                route_opt, time_opt = two_opt_optimize(
                    route, v, t_js
                )  # Применяем 2-opt для оптимизации маршрута
                taxon_points = route_opt[1:-1]  # Исключаем стартовую и конечную точку

                # Добавляем таксон в список
                B.append(
                    {
                        "base": (base_x, base_y),
                        "points": taxon_points,
                        "time_sec": time_opt,
                        "route": route_opt,
                    }
                )

                break  # Переходим к следующей итерации

        else:
            # Все точки оказались недостижимы
            for i, pt in enumerate(points_sorted):
                if i not in visited:
                    C.append(pt)
            break

    return {"N_k": 1, "B": B, "C": C}
