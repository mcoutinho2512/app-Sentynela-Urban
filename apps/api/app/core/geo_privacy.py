"""Utilities for geographic privacy: fuzzing coordinates to protect reporters."""

import math
import random


def fuzz_coordinates(lat: float, lon: float, max_offset_m: float = 150.0) -> tuple[float, float]:
    """Add random offset up to max_offset_m meters to coordinates.

    Returns a new (lat, lon) tuple that is within max_offset_m meters of the original.
    """
    angle = random.uniform(0, 2 * math.pi)
    distance = random.uniform(0, max_offset_m)

    # 1 degree latitude ~ 111,000 meters
    lat_offset = (distance * math.cos(angle)) / 111_000
    lon_offset = (distance * math.sin(angle)) / (111_000 * math.cos(math.radians(lat)))

    return lat + lat_offset, lon + lon_offset


def snap_to_grid(lat: float, lon: float, grid_size_m: float = 200.0) -> tuple[float, float]:
    """Snap coordinates to a grid of approximately grid_size_m meters.

    Used for highly sensitive incident types (tiroteio, assalto) to prevent
    precise location tracking of reporters.
    """
    grid_lat = grid_size_m / 111_000
    grid_lon = grid_size_m / (111_000 * math.cos(math.radians(lat)))

    snapped_lat = round(lat / grid_lat) * grid_lat
    snapped_lon = round(lon / grid_lon) * grid_lon

    return snapped_lat, snapped_lon
