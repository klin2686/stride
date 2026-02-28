"""
RunIQ internal calculation system.

All ideal value formulas are anchored to biomechanics research.
Inputs:
  height_cm  - runner height in centimeters
  weight_kg  - runner weight in kilograms
  gender     - 0 for male, 1 for female
"""

from dataclasses import dataclass


@dataclass
class IdealValues:
    cadence_spm: float  # Steps per minute
    impact_asymmetry_pct: float  # Percentage (ideal = 0)
    braking_force_n: float  # Newtons (upper bound)
    ankle_roll_deg: float  # Degrees of pronation
    ground_contact_ms: float  # Milliseconds


def calculate_ideal_values(
    height_cm: float, weight_kg: float, gender: int
) -> IdealValues:
    """
    Compute the personalized ideal biomechanical values for a runner.

    Args:
        height_cm: Runner height in centimeters.
        weight_kg: Runner weight in kilograms.
        gender:    0 = male, 1 = female.

    Returns:
        IdealValues dataclass with all five ideal metrics.
    """
    h = height_cm
    w = weight_kg
    g = gender  # 0 or 1

    # 1. Cadence (steps per minute)
    # Anchored at 180 spm for a 175 cm runner; drops 1 spm per 2 cm above 175.
    # Females receive a +3 spm adjustment.
    cadence = 180 - ((h - 175) / 2) + (g * 3)

    # 2. Impact Asymmetry (%)
    # Bilateral symmetry is the mathematical ideal; any deviation increases injury risk.
    impact_asymmetry = 0.0

    # 3. Braking Force (Newtons)
    # Elite runners limit braking force to less than 15% of body weight in Newtons.
    braking_force = 0.15 * w * 9.81

    # 4. Ankle Roll / Pronation (degrees)
    # Research shows 6–10 degrees of eversion is healthy shock absorption; 8 degrees is the midpoint.
    ankle_roll = 8.0

    # 5. Ground Contact Time (milliseconds)
    # Anchored at 210 ms for a 70 kg / 175 cm runner.
    # +0.5 ms per kg over 70, +0.4 ms per cm over 175, +5 ms for females.
    ground_contact = 210 + (w - 70) * 0.5 + (h - 175) * 0.4 + (g * 5)

    return IdealValues(
        cadence_spm=round(cadence, 2),
        impact_asymmetry_pct=impact_asymmetry,
        braking_force_n=round(braking_force, 2),
        ankle_roll_deg=ankle_roll,
        ground_contact_ms=round(ground_contact, 2),
    )


def parse_gender(gender_str: str | None) -> int:
    """
    Convert a stored gender string to the numeric G value used in formulas.
    Accepts: 'female'/'f'/'1' → 1, everything else → 0.
    """
    if gender_str is None:
        return 0
    normalized = gender_str.strip().lower()
    return 1 if normalized in ("female", "f", "1") else 0


def ideal_values_for_user(
    height: str | None, weight: str | None, gender: str | None
) -> IdealValues | None:
    """
    Convenience wrapper that accepts raw string values from the User model.
    Returns None if height or weight cannot be parsed.
    """
    try:
        height_cm = float(height)
        weight_kg = float(weight)
    except (TypeError, ValueError):
        return None

    g = parse_gender(gender)
    return calculate_ideal_values(height_cm, weight_kg, g)
