"""
Unit tests for runiq.py ideal value calculations.

Note: IdealValues is used as a dataclass but is missing the @dataclass decorator.
These tests will fail until that is added:
    from dataclasses import dataclass

    @dataclass
    class IdealValues:
        ...
"""

import unittest
from runiq import calculate_ideal_values, ideal_values_for_user, parse_gender


class TestParseGender(unittest.TestCase):
    def test_female_string(self):
        self.assertEqual(parse_gender("female"), 1)

    def test_female_short(self):
        self.assertEqual(parse_gender("f"), 1)

    def test_female_numeric_string(self):
        self.assertEqual(parse_gender("1"), 1)

    def test_female_with_whitespace(self):
        self.assertEqual(parse_gender("  Female  "), 1)

    def test_male_string(self):
        self.assertEqual(parse_gender("male"), 0)

    def test_male_short(self):
        self.assertEqual(parse_gender("m"), 0)

    def test_zero_string(self):
        self.assertEqual(parse_gender("0"), 0)

    def test_none_defaults_to_male(self):
        self.assertEqual(parse_gender(None), 0)

    def test_unknown_string_defaults_to_male(self):
        self.assertEqual(parse_gender("other"), 0)


class TestCalculateIdealValues(unittest.TestCase):
    """Tests for calculate_ideal_values() using the formulas documented in runiq.py."""

    # --- Cadence: 180 - ((h - 175) / 2) + (g * 3) ---

    def test_cadence_reference_male(self):
        # h=175, g=0 → 180 - 0 + 0 = 180
        result = calculate_ideal_values(175, 70, 0)
        self.assertAlmostEqual(result.cadence_spm, 180.0)

    def test_cadence_reference_female(self):
        # h=175, g=1 → 180 - 0 + 3 = 183
        result = calculate_ideal_values(175, 70, 1)
        self.assertAlmostEqual(result.cadence_spm, 183.0)

    def test_cadence_tall_male(self):
        # h=185 (+10 cm), g=0 → 180 - 5 + 0 = 175
        result = calculate_ideal_values(185, 70, 0)
        self.assertAlmostEqual(result.cadence_spm, 175.0)

    def test_cadence_short_female(self):
        # h=165 (-10 cm), g=1 → 180 + 5 + 3 = 188
        result = calculate_ideal_values(165, 70, 1)
        self.assertAlmostEqual(result.cadence_spm, 188.0)

    # --- Impact Asymmetry: always 0.0 ---

    def test_impact_asymmetry_is_zero(self):
        result = calculate_ideal_values(175, 70, 0)
        self.assertEqual(result.impact_asymmetry_pct, 0.0)

    def test_impact_asymmetry_is_zero_female(self):
        result = calculate_ideal_values(160, 55, 1)
        self.assertEqual(result.impact_asymmetry_pct, 0.0)

    # --- Braking Force: 0.15 * w * 9.81 ---

    def test_braking_force_reference(self):
        # w=70 → 0.15 * 70 * 9.81 = 102.955
        result = calculate_ideal_values(175, 70, 0)
        self.assertAlmostEqual(result.braking_force_n, round(0.15 * 70 * 9.81, 2))

    def test_braking_force_scales_with_weight(self):
        light = calculate_ideal_values(175, 50, 0)
        heavy = calculate_ideal_values(175, 100, 0)
        self.assertLess(light.braking_force_n, heavy.braking_force_n)

    def test_braking_force_weight_independent_of_height_gender(self):
        # Same weight → same braking force regardless of height/gender
        a = calculate_ideal_values(160, 80, 0)
        b = calculate_ideal_values(190, 80, 1)
        self.assertAlmostEqual(a.braking_force_n, b.braking_force_n)

    # --- Ankle Roll: always 8.0 ---

    def test_ankle_roll_is_eight(self):
        result = calculate_ideal_values(175, 70, 0)
        self.assertEqual(result.ankle_roll_deg, 8.0)

    def test_ankle_roll_constant_across_inputs(self):
        for h, w, g in [(160, 50, 1), (190, 100, 0), (175, 70, 1)]:
            with self.subTest(h=h, w=w, g=g):
                self.assertEqual(calculate_ideal_values(h, w, g).ankle_roll_deg, 8.0)

    # --- Ground Contact: 210 + (w-70)*0.5 + (h-175)*0.4 + g*5 ---

    def test_ground_contact_reference_male(self):
        # h=175, w=70, g=0 → 210 + 0 + 0 + 0 = 210
        result = calculate_ideal_values(175, 70, 0)
        self.assertAlmostEqual(result.ground_contact_ms, 210.0)

    def test_ground_contact_reference_female(self):
        # h=175, w=70, g=1 → 210 + 0 + 0 + 5 = 215
        result = calculate_ideal_values(175, 70, 1)
        self.assertAlmostEqual(result.ground_contact_ms, 215.0)

    def test_ground_contact_heavier_runner(self):
        # w=80 (+10 kg) → +5 ms vs reference
        result = calculate_ideal_values(175, 80, 0)
        self.assertAlmostEqual(result.ground_contact_ms, 215.0)

    def test_ground_contact_taller_runner(self):
        # h=185 (+10 cm) → +4 ms vs reference
        result = calculate_ideal_values(185, 70, 0)
        self.assertAlmostEqual(result.ground_contact_ms, 214.0)

    def test_ground_contact_combined(self):
        # h=180 (+5), w=75 (+5), g=1 → 210 + 2.5 + 2 + 5 = 219.5
        result = calculate_ideal_values(180, 75, 1)
        self.assertAlmostEqual(result.ground_contact_ms, 219.5)

    def test_ground_contact_lighter_shorter_male(self):
        # h=170 (-5), w=60 (-10), g=0 → 210 - 5 - 2 = 203
        result = calculate_ideal_values(170, 60, 0)
        self.assertAlmostEqual(result.ground_contact_ms, 203.0)


class TestIdealValuesForUser(unittest.TestCase):
    """Tests for the string-input wrapper ideal_values_for_user()."""

    def test_valid_male_inputs(self):
        result = ideal_values_for_user("175", "70", "male")
        self.assertIsNotNone(result)
        self.assertAlmostEqual(result.cadence_spm, 180.0)

    def test_valid_female_inputs(self):
        result = ideal_values_for_user("175", "70", "female")
        self.assertIsNotNone(result)
        self.assertAlmostEqual(result.cadence_spm, 183.0)

    def test_none_height_returns_none(self):
        self.assertIsNone(ideal_values_for_user(None, "70", "male"))

    def test_none_weight_returns_none(self):
        self.assertIsNone(ideal_values_for_user("175", None, "male"))

    def test_invalid_height_string_returns_none(self):
        self.assertIsNone(ideal_values_for_user("tall", "70", "male"))

    def test_invalid_weight_string_returns_none(self):
        self.assertIsNone(ideal_values_for_user("175", "heavy", "male"))

    def test_none_gender_defaults_to_male(self):
        result_none = ideal_values_for_user("175", "70", None)
        result_male = ideal_values_for_user("175", "70", "male")
        self.assertIsNotNone(result_none)
        self.assertEqual(result_none.cadence_spm, result_male.cadence_spm)

    def test_float_strings_accepted(self):
        result = ideal_values_for_user("175.5", "70.2", "f")
        self.assertIsNotNone(result)


if __name__ == "__main__":
    unittest.main()
