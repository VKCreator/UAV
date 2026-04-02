from db import db  # Импортируем db из общего файла


class Drone(db.Model):
    __tablename__ = "drones"

    id = db.Column(db.Integer, primary_key=True)
    model = db.Column(db.String(100), nullable=False)
    fov_vertical = db.Column(db.Float, nullable=False)      # угол обзора (градусы)
    resolution_width = db.Column(db.Integer)
    resolution_height = db.Column(db.Integer)
    max_wind_resistance = db.Column(db.Float)                # м/с
    max_speed = db.Column(db.Float)                          # м/с
    min_speed = db.Column(db.Float)                          # м/с
    battery_life = db.Column(db.Float)                       # минуты

    def to_dict(self):
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
        }