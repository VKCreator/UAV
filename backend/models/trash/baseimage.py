from db import db  # Импортируем db из общего файла

# -----------------------------
# Base Image
# -----------------------------
class BaseImage(db.Model):
    __tablename__ = "base_image"

    image_id = db.Column(db.Integer, primary_key=True)

    source_filename = db.Column(db.String(255), nullable=False)
    image_path = db.Column(db.String(500), nullable=False)
    exif_data = db.Column(db.JSONB, nullable=False)

    flight_schema = db.relationship(
        "FlightSchema",
        back_populates="base_image",
        cascade="all, delete-orphan",
        single_parent=True,
        uselist=False,
    )

    # -------------------------
    # Constructor
    # -------------------------
    def __init__(self, source_filename, image_path, exif_data):
        self.source_filename = source_filename
        self.image_path = image_path
        self.exif_data = exif_data

    # -------------------------
    # Serialize to dict
    # -------------------------
    def to_dict(self, include_schema_id: bool = False):
        data = {
            "image_id": self.image_id,
            "source_filename": self.source_filename,
            "image_path": self.image_path,
            "exif_data": self.exif_data,
        }

        if include_schema_id and self.flight_schema:
            data["flight_schema_id"] = self.flight_schema.schema_id

        return data
