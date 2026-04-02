import math

def time_between(p_from, p_to, v, t_js=5.0, hover=True):
    """Время перемещения между точками"""
    l = math.hypot(p_to[0] - p_from[0], p_to[1] - p_from[1])
    t_move = 1.5 * l / v
    return t_move + (t_js if hover else 0.0)


def session_time(route, v, t_js=5.0):
    """Общее время маршрута"""
    total = t_js
    for i in range(len(route) - 1):
        total += time_between(route[i], route[i + 1], v, t_js, hover=True)
    return total

def calculate_total_flight_time(points, v=5.0, t_js=5.0):
    """
    Рассчитать общее время полёта по массиву точек без посадок и взлётов.
    points: [[x, y], [x, y], ...]
    """
    if not points or len(points) < 1:
        return 0.0
    
    if len(points) == 1:
        return t_js
    
    return session_time(points, v, t_js)