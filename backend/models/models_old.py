"""
SQLAlchemy ORM-модели в стиле Flask-SQLAlchemy.
Совместимо с db = SQLAlchemy() из db.py и Drone.query.all() в app.py.
"""

from datetime import datetime, timezone

from db import db


# ─── Пользователи ─────────────────────────────────────────────────────────────

class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    middle_name = db.Column(db.String(50), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Связи
    flight_schemas = db.relationship("FlightSchema", back_populates="user")

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "username": self.username,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "middle_name": self.middle_name,
            "email": self.email,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ─── Дрон ─────────────────────────────────────────────────────────────────────

class Drone(db.Model):
    __tablename__ = "drones"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    model = db.Column(db.String(128), nullable=False)
    fov_vertical = db.Column(db.Float, nullable=False)
    resolution_width = db.Column(db.Integer, nullable=False)
    resolution_height = db.Column(db.Integer, nullable=False)
    max_wind_resistance = db.Column(db.Float, nullable=False)
    max_speed = db.Column(db.Float, nullable=False)
    min_speed = db.Column(db.Float, nullable=False)
    battery_life = db.Column(db.Float, nullable=False, comment="Время работы батареи, сек")
    image_name = db.Column(db.String(128), nullable=True)

    # Связи
    drone_params = db.relationship("DroneParams", back_populates="drone")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "model": self.model,
            "fov_vertical": self.fov_vertical,
            "resolution_width": self.resolution_width,
            "resolution_height": self.resolution_height,
            "max_wind_resistance": self.max_wind_resistance,
            "max_speed": self.max_speed,
            "min_speed": self.min_speed,
            "battery_life": self.battery_life,
            "image_name": self.image_name
        }


# ─── Параметры камеры ─────────────────────────────────────────────────────────

class CameraParams(db.Model):
    __tablename__ = "camera_params"

    params_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    vertical_fov = db.Column(db.Float, nullable=False)
    resolution_width = db.Column(db.Integer, nullable=False)
    resolution_height = db.Column(db.Integer, nullable=False)
    is_dictionary = db.Column(db.Boolean, default=True, nullable=False)

    # Связи
    drone_params = db.relationship("DroneParams", back_populates="camera_params")

    def to_dict(self) -> dict:
        return {
            "params_id": self.params_id,
            "vertical_fov": self.vertical_fov,
            "resolution_width": self.resolution_width,
            "resolution_height": self.resolution_height,
            "is_dictionary": self.is_dictionary,
        }


# ─── Параметры дрона для конкретной схемы ─────────────────────────────────────

class DroneParams(db.Model):
    __tablename__ = "drone_params"

    params_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    drone_id = db.Column(db.Integer, db.ForeignKey("drones.id"), nullable=False)
    camera_params_id = db.Column(
        db.Integer, db.ForeignKey("camera_params.params_id"), nullable=True
    )
    base_distance = db.Column(db.Float, nullable=True)
    planned_distance = db.Column(db.Float, nullable=True)
    speed = db.Column(db.Float, nullable=True)
    battery_time = db.Column(db.Float, nullable=True)
    hover_time = db.Column(db.Float, nullable=True)
    wind_resistance = db.Column(db.Float, nullable=True)
    is_consider_obstacles = db.Column(db.Boolean, default=True, nullable=False)

    # Связи
    drone = db.relationship("Drone", back_populates="drone_params")
    camera_params = db.relationship("CameraParams", back_populates="drone_params")
    flight_schemas = db.relationship("FlightSchema", back_populates="drone_params")

    def to_dict(self, include_drone: bool = False, include_schema_id: bool = False) -> dict:
        data = {
            "params_id": self.params_id,
            "drone_id": self.drone_id,
            "camera_params_id": self.camera_params_id,
            "base_distance": self.base_distance,
            "planned_distance": self.planned_distance,
            "speed": self.speed,
            "battery_time": self.battery_time,
            "hover_time": self.hover_time,
            "wind_resistance": self.wind_resistance,
            "is_consider_obstacles": self.is_consider_obstacles,
        }

        if include_drone and self.drone:
            data["drone"] = {
                "id": self.drone.id,
                "model": self.drone.model,
                "max_speed": self.drone.max_speed,
                "max_wind_resistance": self.drone.max_wind_resistance,
            }

        if include_schema_id and self.flight_schemas:
            data["flight_schema_id"] = self.flight_schemas[0].schema_id

        return data


# ─── Базовое изображение ──────────────────────────────────────────────────────

class BaseImage(db.Model):
    __tablename__ = "base_images"

    image_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    source_filename = db.Column(db.String(256), nullable=False)
    image_path = db.Column(db.String(512), nullable=False)
    exif_data = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Связи
    flight_schemas = db.relationship("FlightSchema", back_populates="base_image")

    def to_dict(self, include_schema_id: bool = False) -> dict:
        data = {
            "image_id": self.image_id,
            "source_filename": self.source_filename,
            "image_path": self.image_path,
            "exif_data": self.exif_data,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

        if include_schema_id and self.flight_schemas:
            data["flight_schema_id"] = self.flight_schemas[0].schema_id

        return data


# ─── Форма траектории ─────────────────────────────────────────────────────────

class TrajectoriesShapes(db.Model):
    __tablename__ = "trajectories_shapes"

    shapes_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    points = db.Column(db.JSON, nullable=True)
    line = db.Column(db.Float, nullable=True)
    obstacles = db.Column(db.JSON, nullable=True)
    points_count = db.Column(db.Integer, default=0, nullable=False)
    obstacles_count = db.Column(db.Integer, default=0, nullable=False)

    # Связи
    flight_schemas = db.relationship("FlightSchema", back_populates="traj_shapes")

    def to_dict(self) -> dict:
        return {
            "shapes_id": self.shapes_id,
            "points": self.points,
            "line": self.line,
            "obstacles": self.obstacles,
            "points_count": self.points_count,
            "obstacles_count": self.obstacles_count,
        }


# ─── Погодные условия ─────────────────────────────────────────────────────────

class LocalWeather(db.Model):
    __tablename__ = "local_weather"

    weather_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    wind_speed = db.Column(db.Float, nullable=False)
    wind_direction = db.Column(db.Float, nullable=False)
    is_use_api = db.Column(db.Boolean, default=True, nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    is_use_weather = db.Column(db.Boolean, default=True, nullable=False)

    # Связи
    flight_schemas = db.relationship("FlightSchema", back_populates="weather")

    def to_dict(self) -> dict:
        return {
            "weather_id": self.weather_id,
            "wind_speed": self.wind_speed,
            "wind_direction": self.wind_direction,
            "is_use_api": self.is_use_api,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "is_use_weather": self.is_use_weather
        }


# ─── Метод оптимизации ────────────────────────────────────────────────────────

class OptMethod(db.Model):
    __tablename__ = "opt_methods"

    method_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    pretty_name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # Связи
    flight_schemas = db.relationship("FlightSchema", back_populates="priority_opt_method")

    def to_dict(self) -> dict:
        return {
            "method_id": self.method_id,
            "pretty_name": self.pretty_name,
            "description": self.description,
        }


# ─── Результат оптимизации — Метод 1 (МКТ) ───────────────────────────────────

class Opt1Result(db.Model):
    __tablename__ = "opt1_results"

    result_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    taxons = db.Column(db.JSON, nullable=True)
    total_flight_time = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Связи
    flight_schema = db.relationship(
        "FlightSchema",
        back_populates="opt1_result",
        foreign_keys="FlightSchema.opt1_result_id",
        uselist=False,
    )

    def to_dict(self) -> dict:
        return {
            "result_id": self.result_id,
            "taxons": self.taxons,
            "total_flight_time": self.total_flight_time,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ─── Результат оптимизации — Метод 2 (БКТ) ───────────────────────────────────

class Opt2Result(db.Model):
    __tablename__ = "opt2_results"

    result_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    result_data = db.Column(db.JSON, nullable=True)
    total_flight_time = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Связи
    flight_schema = db.relationship(
        "FlightSchema",
        back_populates="opt2_result",
        foreign_keys="FlightSchema.opt2_result_id",
        uselist=False,
    )

    def to_dict(self) -> dict:
        return {
            "result_id": self.result_id,
            "result_data": self.result_data,
            "total_flight_time": self.total_flight_time,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# ─── Название раскадровки (справочник) ───────────────────────────────────────

class StoryboardName(db.Model):
    __tablename__ = "storyboard_names"

    storyboard_name_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    pretty_name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # Связи
    storyboards = db.relationship("Storyboard", back_populates="name")

    def to_dict(self) -> dict:
        return {
            "storyboard_name_id": self.storyboard_name_id,
            "pretty_name": self.pretty_name,
            "description": self.description,
        }


# ─── Раскадровка ──────────────────────────────────────────────────────────────

class Storyboard(db.Model):
    __tablename__ = "storyboards"

    storyboard_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name_id = db.Column(
        db.Integer, db.ForeignKey("storyboard_names.storyboard_name_id"), nullable=False
    )
    total_flight_time = db.Column(db.Float, nullable=True)
    count_frames = db.Column(db.Integer, nullable=True)
    disk_space = db.Column(db.BigInteger, nullable=True)
    step_x = db.Column(db.Float, nullable=True)
    step_y = db.Column(db.Float, nullable=True)
    points = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Связи
    name = db.relationship("StoryboardName", back_populates="storyboards")

    def to_dict(self) -> dict:
        return {
            "storyboard_id": self.storyboard_id,
            "name_id": self.name_id,
            "total_flight_time": self.total_flight_time,
            "count_frames": self.count_frames,
            "disk_space": self.disk_space,
            "step_x": self.step_x,
            "step_y": self.step_y,
            "points": self.points,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ─── Схема полёта (центральная таблица) ───────────────────────────────────────

class FlightSchema(db.Model):
    __tablename__ = "flight_schemas"

    schema_id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    image_id = db.Column(db.Integer, db.ForeignKey("base_images.image_id"), nullable=True)
    drone_params_id = db.Column(db.Integer, db.ForeignKey("drone_params.params_id"), nullable=True)
    traj_shapes_id = db.Column(db.Integer, db.ForeignKey("trajectories_shapes.shapes_id"), nullable=True)
    weather_id = db.Column(db.Integer, db.ForeignKey("local_weather.weather_id"), nullable=True)
    point_storyboard_id = db.Column(db.Integer, db.ForeignKey("storyboards.storyboard_id"), nullable=True)
    recommend_storyboard_id = db.Column(db.Integer, db.ForeignKey("storyboards.storyboard_id"), nullable=True)
    optimal_storyboard_id = db.Column(db.Integer, db.ForeignKey("storyboards.storyboard_id"), nullable=True)
    priority_opt_method_id = db.Column(db.Integer, db.ForeignKey("opt_methods.method_id"), nullable=True)
    opt1_result_id = db.Column(db.Integer, db.ForeignKey("opt1_results.result_id"), nullable=True)
    opt2_result_id = db.Column(db.Integer, db.ForeignKey("opt2_results.result_id"), nullable=True)

    schema_name = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Связи
    user = db.relationship("User", back_populates="flight_schemas")
    base_image = db.relationship("BaseImage", back_populates="flight_schemas")
    drone_params = db.relationship("DroneParams", back_populates="flight_schemas")
    traj_shapes = db.relationship("TrajectoriesShapes", back_populates="flight_schemas")
    weather = db.relationship("LocalWeather", back_populates="flight_schemas")
    priority_opt_method = db.relationship("OptMethod", back_populates="flight_schemas")
    opt1_result = db.relationship(
        "Opt1Result", back_populates="flight_schema", foreign_keys=[opt1_result_id]
    )
    opt2_result = db.relationship(
        "Opt2Result", back_populates="flight_schema", foreign_keys=[opt2_result_id]
    )
    point_storyboard = db.relationship(
        "Storyboard", foreign_keys=[point_storyboard_id]
    )
    recommend_storyboard = db.relationship(
        "Storyboard", foreign_keys=[recommend_storyboard_id]
    )
    optimal_storyboard = db.relationship(
        "Storyboard", foreign_keys=[optimal_storyboard_id]
    )

    def to_dict(self) -> dict:
        return {
            "schema_id": self.schema_id,
            "schema_name": self.schema_name,
            "user_id": self.user_id,
            "image_id": self.image_id,
            "drone_params_id": self.drone_params_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }