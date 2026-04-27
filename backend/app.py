# app.py
from functools import wraps
import json as _json
import os
import uuid
import datetime

from flask import Flask, jsonify, request, send_from_directory
from flask_restx import Api, Resource, fields, Namespace
from flask_cors import CORS
from flask_migrate import Migrate
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from PIL import Image
from config import Config
from models import (
    User,
    Drone,
    CameraParams,
    DroneParams,
    BaseImage,
    TrajectoriesShapes,
    LocalWeather,
    OptMethod,
    OptResults,      
    OptResult,      
    StoryboardName,
    StoryboardResults, 
    Storyboard,
    FlightMap,
)
from db import db
from trajectory.planner import build_taxons
from trajectory.planner import build_taxons_big_density
from trajectory.planner import build_taxons_hybrid

from trajectory.flight_time import calculate_total_flight_time

# ─── Константы ────────────────────────────────────────────────────────────────

ALLOWED_ORIGINS = [
    "http://192.168.1.43:7777",
    "http://localhost:5173",
    "http://192.168.1.57:7777",
    "http://nmstuvtip.ddns.net:7777",
    "http://skypath.ddnsking.com:7777",
]

migrate = Migrate()


# ─── Фабрика приложения ───────────────────────────────────────────────────────

def create_app():
    app = Flask(__name__)
    app.url_map.strict_slashes = False

    UPLOAD_FOLDER = os.path.join(app.root_path, "static", "uploads")
    THUMB_FOLDER  = os.path.join(app.root_path, "static", "uploads", "thumbs")
    BASE_DIR = os.path.join(app.root_path, "static")

    app.config.from_object(Config)
    app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
    app.config["THUMB_FOLDER"] = THUMB_FOLDER
    app.config["ALLOWED_EXTENSIONS"] = {"png", "jpg", "jpeg", "gif", "dng"}
    app.config["SECRET_KEY"] = "n4v!q8s#d2k@z0r7w$y1p*e6t^u9m"

    db.init_app(app)
    migrate.init_app(app, db)

    CORS(app, resources={
        r"/api/*": {"origins": ALLOWED_ORIGINS},
        r"/*":     {"origins": ALLOWED_ORIGINS},
    })

    # ── Swagger / flask-restx ──────────────────────────────────────────────────
    #
    # authorizations — описывает схему Bearer-токена.
    # После этого в Swagger UI появится кнопка «Authorize»,
    # а у защищённых эндпоинтов будет иконка замка.
    #
    authorizations = {
        "BearerAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "Authorization",
            "description": 'Введите токен в формате: **Bearer &lt;token&gt;**',
        }
    }

    api = Api(
        app,
        version="1.0",
        title="TrajUAV API",
        description="REST API для управления траекториями БПЛА",
        doc="/docs/",
        prefix="/api",
        authorizations=authorizations,
        security="BearerAuth",          # применяется глобально (замок везде)
        swagger_ui_parameters={"docExpansion": "list"},
    )

    # ── Namespace-ы (разбивают Swagger на секции) ──────────────────────────────
    ns_auth    = api.namespace("auth",    description="Аутентификация")
    ns_users   = api.namespace("users",   description="Пользователи")
    ns_drones  = api.namespace("drones",  description="БПЛА")
    ns_schemas = api.namespace("schemas", description="Схемы полётов")
    ns_traj    = api.namespace("trajectory", description="Расчёт траектории")

    # ─── Декоратор авторизации ─────────────────────────────────────────────────

    def token_required(f):
        """
        Проверяет JWT из заголовка Authorization: Bearer <token>.
        При ошибке возвращает JSON с понятным сообщением и нужным HTTP-кодом,
        чтобы фронтенд мог различать: 401 = не авторизован, 403 = заблокирован.
        """
        @wraps(f)
        def decorator(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")

            if not auth_header:
                return {"message": "Токен отсутствует. Войдите в систему."}, 401

            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != "bearer":
                return {"message": "Неверный формат токена. Используйте: Bearer <token>"}, 401

            token = parts[1]
            try:
                data = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
            except jwt.ExpiredSignatureError:
                return {"message": "Токен истёк. Войдите снова."}, 401
            except jwt.InvalidTokenError:
                return {"message": "Недействительный токен."}, 401

            request.current_user = data["user"]   # username (строка)
            return f(*args, **kwargs)

        return decorator

    # ─── Swagger-модели ────────────────────────────────────────────────────────

    # Auth
    login_input = ns_auth.model("LoginInput", {
        "username": fields.String(required=True, example="ivanov"),
        "password": fields.String(required=True, example="secret"),
    })
    login_output = ns_auth.model("LoginOutput", {
        "token": fields.String(description="JWT access token"),
    })

    register_input = ns_auth.model("RegisterInput", {
        "username":    fields.String(required=True),
        "password":    fields.String(required=True),
        "email":       fields.String(required=True),
        "first_name":  fields.String(required=True),
        "last_name":   fields.String(required=True),
        "middle_name": fields.String,
    })

    # Users
    user_model = ns_users.model("User", {
        "user_id":     fields.Integer(readonly=True),
        "username":    fields.String,
        "first_name":  fields.String,
        "last_name":   fields.String,
        "middle_name": fields.String,
        "email":       fields.String,
        "is_active":   fields.Boolean,
        "created_at":  fields.String,
    })

    # Drones
    drone_model = ns_drones.model("Drone", {
        "drone_id":                 fields.Integer(readonly=True),
        "model":              fields.String(required=True),
        "default_vertical_fov":       fields.Float(required=True),
        "default_resolution_width":   fields.Integer,
        "default_resolution_height":  fields.Integer,
        "max_wind_resistance":fields.Float,
        "max_speed":          fields.Float,
        "min_speed":          fields.Float,
        "max_battery_life":       fields.Float,
        "model_image_path":         fields.String(required=False)
    })

    # Trajectory
    point_model = ns_traj.model("Point", {
        "x": fields.Float(required=True),
        "y": fields.Float(required=True),
    })
    trajectory_input = ns_traj.model("TrajectoryRequest", {
        "width_m":    fields.Float(required=True),
        "height_m":   fields.Float(required=True),
        "lineY":      fields.Float(required=True),
        "points":     fields.List(fields.Nested(point_model), required=True),
        "speed":      fields.Float,
        "hoverTime":  fields.Float,
        "batteryTime":fields.Float,
    })

    # ─── /auth/register ───────────────────────────────────────────────────────

    @ns_auth.route("/register")
    class Register(Resource):
        @ns_auth.expect(register_input)
        @ns_auth.response(201, "Пользователь зарегистрирован")
        @ns_auth.response(400, "Ошибка валидации")
        def post(self):
            """Регистрация нового пользователя"""
            data = request.json
            username   = data.get("username")
            password   = data.get("password")
            email      = data.get("email")
            first_name = data.get("first_name")
            last_name  = data.get("last_name")
            middle_name = data.get("middle_name")

            if not username or not password or not email:
                return {"message": "username, password и email обязательны"}, 400

            if User.query.filter_by(username=username).first():
                return {"message": "Пользователь с таким именем уже существует"}, 400

            if User.query.filter_by(email=email).first():
                return {"message": "Пользователь с таким email уже существует"}, 400

            user = User(
                username=username,
                password_hash=generate_password_hash(password),
                first_name=first_name,
                last_name=last_name,
                middle_name=middle_name,
                email=email,
                is_active=True

            )
            db.session.add(user)
            db.session.commit()

            return {"message": "Пользователь успешно зарегистрирован"}, 201

    # ─── /auth/login ──────────────────────────────────────────────────────────

    @ns_auth.route("/login")
    class Login(Resource):
        @ns_auth.expect(login_input)
        @ns_auth.marshal_with(login_output)
        @ns_auth.response(401, "Неверные учётные данные")
        def post(self):
            """Войти и получить JWT-токен"""
            data = request.json
            username = data.get("username")
            password = data.get("password")

            if not username or not password:
                return {"message": "username и password обязательны"}, 400

            user = User.query.filter_by(username=username).first()
            if not user or not check_password_hash(user.password_hash, password):
                return {"message": "Неверное имя пользователя или пароль"}, 401

            if not user.is_active:
                return {"message": "Аккаунт заблокирован"}, 403

            token = jwt.encode(
                {
                    "user":       user.username,
                    "first_name": user.first_name,
                    "middle_name": user.middle_name,
                    "last_name":  user.last_name,
                    "email":      user.email,
                    "active":     user.is_active,
                    "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8),
                },
                app.config["SECRET_KEY"],
                algorithm="HS256",
            )
            return {"token": token}

    # ─── /users/me ────────────────────────────────────────────────────────────

    @ns_users.route("/me")
    class UserMe(Resource):
        @token_required
        @ns_users.marshal_with(user_model)
        @ns_users.response(401, "Не авторизован")
        @ns_users.response(403, "Аккаунт заблокирован")
        @ns_users.response(404, "Пользователь не найден")
        def get(self):
            """Получить данные текущего пользователя (требует токен)"""
            user = User.query.filter_by(username=request.current_user).first()
            if user is None:
                return {"message": "Пользователь не найден"}, 404
            if not user.is_active:
                return {"message": "Аккаунт заблокирован"}, 403
            return user.to_dict()

    # ─── /drones ──────────────────────────────────────────────────────────────

    @ns_drones.route("/")
    class DroneList(Resource):
        @ns_drones.marshal_list_with(drone_model)
        def get(self):
            """Получить список всех БПЛА"""
            return [d.to_dict() for d in Drone.query.order_by(Drone.model.asc()).all()]
              
        @token_required
        @ns_drones.expect(drone_model)
        @ns_drones.marshal_with(drone_model, code=201)
        @ns_drones.response(401, "Не авторизован")
        def post(self):
            """Добавить новый БПЛА (требует токен)"""
            data = api.payload
            drone = Drone(
                model=data["model"],
                default_vertical_fov=data["vertical_fov"],
                default_resolution_width=data.get("resolution_width"),
                default_resolution_height=data.get("resolution_height"),
                max_wind_resistance=data.get("max_wind_resistance"),
                max_speed=data.get("max_speed"),
                min_speed=data.get("min_speed"),
                max_battery_life=data.get("battery_life"),
                model_image_path = data.get("image_path")
            )
            db.session.add(drone)
            db.session.commit()
            return drone.to_dict(), 201

    @ns_drones.route("/<int:drone_id>")
    @ns_drones.param("drone_id", "ID дрона")
    class DroneItem(Resource):
        @ns_drones.marshal_with(drone_model)
        @ns_drones.response(404, "БПЛА не найден")
        def get(self, drone_id):
            """Получить БПЛА по ID"""
            return Drone.query.get_or_404(drone_id).to_dict()

        @token_required
        @ns_drones.response(204, "Удалено")
        @ns_drones.response(401, "Не авторизован")
        @ns_drones.response(404, "БПЛА не найден")
        def delete(self, drone_id):
            """Удалить БПЛА (требует токен)"""
            drone = Drone.query.get_or_404(drone_id)
            db.session.delete(drone)
            db.session.commit()
            return "", 204

    # ─── /trajectory/calculate ────────────────────────────────────────────────

    @ns_traj.route("/calculate/method1")
    class TrajectoryCalculate(Resource):
        @ns_traj.expect(trajectory_input)
        def post(self):
            """Рассчитать оптимизированную траекторию по методу 1 (НП)"""
            data = request.json
            print(data)
            result = build_taxons(
                data["width_m"],
                data["height_m"],
                [(p["x"], p["y"]) for p in data["points"]],
                data["speed"],
                data["batteryTime"] * 60,
                data["hoverTime"],
                data["lineY"],
                data["windSpeed"],
                data["windDirection"],
                data["windResistance"],
                data["isUseWeather"]
            )
            return result

    @ns_traj.route("/calculate/method2")
    class TrajectoryCalculateMethod2(Resource):
        @ns_traj.expect(trajectory_input)
        def post(self):
            """Рассчитать оптимизированную траекторию по методу 2 (ВП)"""
            data = request.json
            print(data)
            result = build_taxons_big_density(
                data["width_m"],
                data["height_m"],
                data["n_cols"],
                data["n_rows"],
                [(p["x"], p["y"]) for p in data["points"]],
                data["speed"],
                data["batteryTime"] * 60,
                data["hoverTime"],
                data["lineY"],
                data["windSpeed"],
                data["windDirection"],
                data["windResistance"],
                data["isUseWeather"]
            )
            return result

    @ns_traj.route("/calculate/method3")
    class TrajectoryCalculateMethod3(Resource):
        @ns_traj.expect(trajectory_input)
        def post(self):
            """Рассчитать оптимизированную траекторию по методу 3 (Комби)"""
            data = request.json
            print(data)
            result = build_taxons_hybrid(
                data["width_m"],
                data["height_m"],
                data["n_cols"],
                data["n_rows"],
                [(p["x"], p["y"]) for p in data["points"]],
                data["speed"],
                data["batteryTime"] * 60,
                data["hoverTime"],
                data["lineY"],
                data["windSpeed"],
                data["windDirection"],
                data["windResistance"],
                data["isUseWeather"]
            )
            return result

    @ns_traj.route("/flight-time")
    class FlightTime(Resource):
        def post(self):
            """Рассчитать время полёта по точкам"""
            data = request.get_json()
            if not data or "points" not in data:
                return {"error": "points обязательны"}, 400
            try:
                total = calculate_total_flight_time(
                    data["points"],
                    data.get("v", 5.0),
                    data.get("hover_time", 5.0),
                )
                return {"flight_time_sec": total}
            except Exception as e:
                return {"error": str(e)}, 500

    # /schemas/full (полная модель FlightMap)
    @ns_schemas.route("/full")
    class SchemaFullList(Resource):
        def get(self):
            """Список всех полных схем"""
            schemas = FlightMap.query.order_by(FlightMap.created_at.desc()).all()
            result = []
            for s in schemas:
                
                # Берем время полета из приоритетного метода
                flight_time = None
                pointCount = None
                # Проверяем, что у схемы есть приоритетный метод и есть контейнер с результатами
                if s.priority_opt_method_id and s.opt_results and s.opt_results.items:
                    # Ищем результат optimization, method_id которого совпадает с приоритетным
                    matching_opt = next(
                        (item for item in s.opt_results.items if item.method_id == s.priority_opt_method_id),
                        None
                    )
                    
                    if matching_opt:
                        flight_time = matching_opt.total_flight_time

                        if matching_opt.taxons and "B" in matching_opt.taxons:
                            pointCount = sum(len(t.get("points", [])) for t in matching_opt.taxons["B"])

                if pointCount is None and s.traj_shapes:
                    pointCount = s.traj_shapes.points_count

                # Модель дрона
                drone_model = None
                if s.drone_params and s.drone_params.drone:
                    drone_model = s.drone_params.drone.model

                result.append({
                    "id":                  s.map_id,
                    "user":                s.user.to_dict() if s.user else None,
                    "schemaName":          s.map_name,
                    "pointCount":          pointCount,
                    "distanceToCamera":    s.drone_params.planned_distance    if s.drone_params      else None,
                    "flightTime":          flight_time,
                    "methodType":          s.priority_opt_method.pretty_name if s.priority_opt_method else None,
                    "schemaImage":         s.base_image.image_path         if s.base_image        else None,
                    "isWeatherConditions": s.is_use_weather, 
                    "droneModel":          drone_model,
                    "createdAt":           s.created_at.isoformat().replace("+00:00", "Z") if s.created_at else None,
                })
            return result, 200

        @token_required
        @ns_schemas.response(401, "Не авторизован")
        def post(self):
            """Создать полную схему полёта (требует токен)"""

            # ── helpers ───────────────────────────────────────────────────────
            def _float(key, default=None):
                v = request.form.get(key)
                try:   return float(v) if v not in (None, "") else default
                except: return default

            def _int(key, default=None):
                v = request.form.get(key)
                try:   return int(v) if v not in (None, "") else default
                except: return default

            def _bool(key, default=False):
                return request.form.get(key, "").lower() in ("true", "1", "yes")

            def _json_field(key):
                v = request.form.get(key)
                if not v: return None
                try:   return _json.loads(v)
                except: return None

            # ── валидация ─────────────────────────────────────────────────────
            map_name = request.form.get("map_name", "").strip()
            image_file  = request.files.get("image")

            if not map_name:
                return {"error": "map_name обязателен"}, 400
            if not image_file:
                return {"error": "image обязателен"}, 400

            # ── user из токена ────────────────────────────────────────────────
            user = User.query.filter_by(username=request.current_user).first()
            if not user:
                return {"error": "Пользователь не найден"}, 404

            try:
                # 1. BaseImage
                os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                filename    = secure_filename(image_file.filename)
                ext         = filename.rsplit(".", 1)[-1].lower()
                unique_name = f"{uuid.uuid4()}.{ext}"
                image_file.save(os.path.join(UPLOAD_FOLDER, unique_name))

                base_image = BaseImage(
                    source_filename=filename,
                    image_path=os.path.join("uploads", unique_name),
                    exif_data=_json_field("exif_data"),
                )
                db.session.add(base_image)
                db.session.flush()

                # 2. CameraParams
                # Обратите внимание: поле переименовано в is_from_dictionary
                cam = CameraParams(
                    vertical_fov=_float("camera_fov"),
                    resolution_width=_int("camera_resolution_width"),
                    resolution_height=_int("camera_resolution_height"),
                    is_from_dictionary=_bool("camera_use_from_reference", True),
                )
                db.session.add(cam)
                db.session.flush()

                # 3. DroneParams
                drone_id_val = _int("drone_id")
                if drone_id_val is None:
                    return {"error": "drone_id обязателен"}, 400

                drone_params_obj = DroneParams(
                    drone_id=drone_id_val,
                    camera_params_id=cam.params_id,
                    base_distance=_float("base_distance"),
                    planned_distance=_float("planned_distance"),
                    speed=_float("speed"),
                    battery_time=_float("battery_time"),
                    hover_time=_float("hover_time"),
                    wind_resistance=_float("wind_resistance"),
                    is_consider_obstacles=_bool("consider_obstacles", True),
                )
                db.session.add(drone_params_obj)
                db.session.flush()

                # 4. TrajectoriesShapes
                points_raw    = _json_field("points")    or []
                obstacles_raw = _json_field("obstacles") or []

                traj_shapes = TrajectoriesShapes(
                    points=points_raw,
                    line=_float("flight_line_y"),
                    obstacles=obstacles_raw,
                    points_count=len(points_raw),
                    obstacles_count=len(obstacles_raw),
                )
                db.session.add(traj_shapes)
                db.session.flush()

                # 5. LocalWeather
                weather = LocalWeather(
                    wind_speed=_float("wind_speed", 0.0),
                    wind_direction=_float("wind_direction", 0.0),
                    is_use_api=_bool("use_weather_api", True),
                    latitude=_float("weather_lat"),
                    longitude=_float("weather_lon"),
                )
                db.session.add(weather)
                db.session.flush()

                # 6. Определение приоритетного метода
                priority_method_id = None
                method_name = request.form.get("priority_opt_method")
                if method_name:
                    m = OptMethod.query.filter_by(name=method_name).first()
                    if m:
                        priority_method_id = m.method_id

                # 7. OptResults (Контейнер) и OptResult (Элементы)
                opt_results_obj = OptResults(count_opt=0)
                db.session.add(opt_results_obj)
                db.session.flush()

                # Описываем варианты для обработки
                # opt1 использует вычисленный ранее priority_method_id
                # Для opt2 и opt3 попробуем найти method_id по полям формы вида optX_method_name
                opt_variants = [
                    {"prefix": "opt1", "method_id": 1},
                    {"prefix": "opt2", "method_id": 2},
                    {"prefix": "opt3", "method_id": 3},
                ]

                # Вспомогательная функция для поиска ID метода по pretty_name
                # def get_method_id_by_name(name):
                #     if not name: return None
                #     m = OptMethod.query.filter_by(pretty_name=name).first()
                #     return m.method_id if m else None

                # Определяем method_id для opt2 и opt3
                # Предполагаем, что форма может содержать поля "opt2_method_name" и "opt3_method_name"
                # for v in opt_variants:
                #         method_name = request.form.get(f"{v['prefix']}_method_name")
                #         v["method_id"] = get_method_id_by_name(method_name)

                # Создаем объекты OptResult
                for v in opt_variants:
                    taxons = _json_field(f"{v['prefix']}_taxons")
                    flight_time = _float(f"{v['prefix']}_total_flight_time")
                    
                    if taxons is not None and v["method_id"]:
                        opt_item = OptResult(
                            results_id=opt_results_obj.results_id,
                            method_id=v["method_id"],
                            taxons=taxons,
                            total_flight_time=flight_time,
                        )
                        db.session.add(opt_item)
                        opt_results_obj.count_opt += 1
                
                db.session.flush()

                # 8. StoryboardResults (Контейнер) и Storyboards (Элементы)
                sb_results_obj = StoryboardResults(count_storyboards=0)
                db.session.add(sb_results_obj)
                db.session.flush()

                # Функция-хелпер для создания раскадровки
                def _add_sb(key, name_id):
                    raw = _json_field(key)
                    if raw:
                        sb = Storyboard(
                            storyboard_name_id=name_id,
                            results_id=sb_results_obj.results_id,
                            total_flight_time=raw.get("total_flight_time"),
                            count_frames=raw.get("count_frames"),
                            disk_space=raw.get("disk_space"),
                            step_x=raw.get("step_x"),
                            step_y=raw.get("step_y"),
                            points=raw.get("points")
                        )
                        db.session.add(sb)
                        return True
                    return False

                # name_id: 1=point, 2=recommended, 3=optimal (предполагаем, что справочник заполнен)
                if _add_sb("storyboard_point", 1): sb_results_obj.count_storyboards += 1
                if _add_sb("storyboard_recommended", 2): sb_results_obj.count_storyboards += 1
                if _add_sb("storyboard_optimal", 3): sb_results_obj.count_storyboards += 1
                if _add_sb("storyboard_optimal_big_density", 4): sb_results_obj.count_storyboards += 1
                if _add_sb("storyboard_optimal_combi", 5): sb_results_obj.count_storyboards += 1

                db.session.flush()

                # 9. FlightMap
                flight_schema = FlightMap(
                    user_id=user.user_id,
                    map_name=map_name,
                    image_id=base_image.image_id,
                    drone_params_id=drone_params_obj.params_id,
                    traj_shapes_id=traj_shapes.shapes_id,
                    weather_id=weather.weather_id,
                    opt_results_id=opt_results_obj.results_id,
                    storyboard_results_id=sb_results_obj.results_id,
                    priority_opt_method_id=priority_method_id,
                    is_use_weather=_bool("use_weather", False),
                )
                db.session.add(flight_schema)
                db.session.commit()

                return {"message": "Схема создана успешно", "map_id": flight_schema.map_id}, 201

            except Exception as e:
                db.session.rollback()
                return {"error": f"Ошибка при создании схемы: {str(e)}"}, 500

    @ns_schemas.route("/full/<int:map_id>")
    @ns_schemas.param("map_id", "ID схемы полёта")
    class SchemaFullItem(Resource):
        @ns_schemas.response(404, "Схема не найдена")
        def get(self, map_id):
            """Получить полные данные схемы по ID"""
            s = FlightMap.query.get_or_404(map_id)

            drone_data = None
            if s.drone_params:
                # Используем to_dict с флагом include_drone=True для вложенности
                drone_data = s.drone_params.to_dict(include_drone=True)
                # Лишняя логика удаления drone из словаря не нужна, т.к. to_dict управляется аргументами
                # Если нужно включить camera_params, можно расширить to_dict в модели или добавить здесь вручную:
                if s.drone_params.camera_params:
                    drone_data["camera_params"] = s.drone_params.camera_params.to_dict()

            return {
                "map_id":              s.map_id,
                "user":                s.user.to_dict() if s.user else None,
                "map_name":            s.map_name,
                "created_at":          s.created_at.isoformat() if s.created_at else None,
                "updated_at":          s.updated_at.isoformat() if s.updated_at else None,
                "base_image":          s.base_image.to_dict()   if s.base_image  else None,
                "drone_params":        drone_data,
                "traj_shapes":         s.traj_shapes.to_dict()  if s.traj_shapes  else None,
                "weather":             s.weather.to_dict()      if s.weather      else None,
                "is_use_weather":       s.is_use_weather,
                # Структура изменилась: теперь контейнеры
                "opt_results":         s.opt_results.to_dict(include_items=True) if s.opt_results else None,
                "storyboard_results":  s.storyboard_results.to_dict(include_items=True) if s.storyboard_results else None,
                
                "priority_opt_method": s.priority_opt_method.to_dict() if s.priority_opt_method else None,
            }, 200

        @token_required 
        @ns_schemas.response(204, "Удалено")
        @ns_schemas.response(401, "Не авторизован")
        @ns_schemas.response(404, "Схема не найдена")
        def delete(self, map_id):
            """Удалить схему и все связанные данные (требует токен)"""
            user = User.query.filter_by(username=request.current_user).first()
            if not user:
                return {"error": "Пользователь не найден"}, 404

            schema = FlightMap.query.filter_by(map_id=map_id).first()
            if not schema:
                return {"error": "Схема не найдена"}, 404

            try:
                # Сохраняем ссылки на связанные объекты для удаления
                image_path = schema.base_image.image_path if schema.base_image else None
                drone_params = schema.drone_params
                traj_shapes = schema.traj_shapes
                weather = schema.weather
                opt_results = schema.opt_results         # Контейнер
                storyboard_results = schema.storyboard_results # Контейнер
                base_image = schema.base_image

                # 1. Удаляем FlightMap (снимаем FK связи)
                db.session.delete(schema)
                db.session.flush()

                # 2. Удаляем контейнеры (cascade="all, delete-orphan" в моделях удаляет дочерние элементы)
                if opt_results:
                    db.session.delete(opt_results)
                if storyboard_results:
                    db.session.delete(storyboard_results)

                # 3. Удаляем остальные зависимые сущности
                if drone_params:
                    if drone_params.camera_params:
                        db.session.delete(drone_params.camera_params)
                    db.session.delete(drone_params)

                if traj_shapes: db.session.delete(traj_shapes)
                if weather:     db.session.delete(weather)
                if base_image:  db.session.delete(base_image)

                db.session.commit()

                # 4. Файловая система
                if image_path:
                    image_path = image_path.replace("\\", "/")
                    filename = os.path.basename(image_path)
                    
                    full_path = os.path.join(BASE_DIR, image_path)
                    if os.path.exists(full_path):
                        os.remove(full_path)

                    thumb_path = os.path.join(THUMB_FOLDER, filename)
                    if os.path.exists(thumb_path):
                        os.remove(thumb_path)

                return {"message": "Схема удалена"}, 200

            except Exception as e:
                db.session.rollback()
                return {"error": f"Ошибка при удалении: {str(e)}"}, 500

    # ─── Статика (загруженные изображения) ────────────────────────────────────

    @app.route("/uploads/<filename>")
    def uploaded_file(filename):
        return send_from_directory(UPLOAD_FOLDER, filename, max_age=3600)

    @app.route("/uploads/thumbs/<filename>")
    def uploaded_thumb(filename):
        thumb_path = os.path.join(THUMB_FOLDER, filename)
        original_path = os.path.join(UPLOAD_FOLDER, filename)

        # Если превью нет — создаём
        if not os.path.exists(thumb_path):
            if not os.path.exists(original_path):
                return "File not found", 404

            os.makedirs(THUMB_FOLDER, exist_ok=True)

            with Image.open(original_path) as img:
                img.thumbnail((300, 300))  # размер превью
                img.save(thumb_path, optimize=True, quality=75)

        return send_from_directory(THUMB_FOLDER, filename, max_age=3600)

    return app

# ─── Точка входа ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=True, host="0.0.0.0", port=5000)