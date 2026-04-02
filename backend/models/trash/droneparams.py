from db import db  # Импортируем db из общего файла


# -----------------------------
# Drone Params (зависим от FlightSchema)
# -----------------------------
class DroneParams(db.Model):
    __tablename__ = "drone_params"

    params_id = db.Column(db.Integer, primary_key=True)

    drone_id = db.Column(db.Integer, db.ForeignKey("drone.drone_id"), nullable=False)

    base_distance = db.Column(db.Float)
    planned_distance = db.Column(db.Float)
    speed = db.Column(db.Float)
    battery_time = db.Column(db.Float)
    hover_time = db.Column(db.Float)

    wind_resistance = db.Column(db.Float)
    isConsiderObstacles = db.Column(db.Boolean)

    drone = db.relationship("Drone", back_populates="drone_params")

    flight_schema = db.relationship(
        "FlightSchema",
        back_populates="drone_params",
        cascade="all, delete-orphan",
        single_parent=True,
        uselist=False,
    )

    # -------------------------
    # Constructor
    # -------------------------
    def __init__(
        self,
        drone_id: int,
        base_distance: float = None,
        planned_distance: float = None,
        speed: float = None,
        battery_time: float = None,
        hover_time: float = None,
        wind_resistance: float = None,
        isConsiderObstacles: bool = False,
    ):
        self.drone_id = drone_id
        self.base_distance = base_distance
        self.planned_distance = planned_distance
        self.speed = speed
        self.battery_time = battery_time
        self.hover_time = hover_time
        self.wind_resistance = wind_resistance
        self.isConsiderObstacles = isConsiderObstacles

    # -------------------------
    # Serialize
    # -------------------------
    def to_dict(
        self,
        include_drone: bool = False,
        include_schema_id: bool = False,
    ):
        data = {
            "params_id": self.params_id,
            "drone_id": self.drone_id,
            "base_distance": self.base_distance,
            "planned_distance": self.planned_distance,
            "speed": self.speed,
            "battery_time": self.battery_time,
            "hover_time": self.hover_time,
            "wind_resistance": self.wind_resistance,
            "isConsiderObstacles": self.isConsiderObstacles,
        }

        if include_drone and self.drone:
            data["drone"] = {
                "drone_id": self.drone.drone_id,
                "model": self.drone.model,
                "max_speed": self.drone.max_speed,
                "max_wind_resistance": self.drone.max_wind_resistance,
            }

        if include_schema_id and self.flight_schema:
            data["flight_schema_id"] = self.flight_schema.schema_id

        return data
