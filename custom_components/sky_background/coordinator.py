"""Computes the time-of-day period and the weather effect."""
from __future__ import annotations

from datetime import datetime, timedelta
import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.helpers.sun import get_astral_event_date
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator
from homeassistant.util import dt as dt_util

from .const import CONDITION_EFFECT, DEFAULTS, DOMAIN, FRONTEND_KEYS

_LOGGER = logging.getLogger(__name__)


def merged_options(entry: ConfigEntry) -> dict[str, Any]:
    """Defaults < data < options."""
    return {**DEFAULTS, **entry.data, **entry.options}


class SkyCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Recalculates every minute and on weather changes."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            config_entry=entry,
            update_interval=timedelta(minutes=1),
        )
        self.entry = entry
        self.opts = merged_options(entry)
        self._override: dict[str, Any] = {}
        self._override_until: datetime | None = None

    @callback
    def async_start(self) -> None:
        """Listen for weather/temperature changes."""
        ids = [
            e
            for e in (self.opts["weather_entity"], self.opts["temperature_entity"])
            if e
        ]
        if ids:

            @callback
            def _changed(_: Event) -> None:
                self.hass.async_create_task(self.async_request_refresh())

            self.entry.async_on_unload(
                async_track_state_change_event(self.hass, ids, _changed)
            )

    def set_override(self, period: str | None, effect: str | None, minutes: int) -> None:
        self._override = {k: v for k, v in (("period", period), ("effect", effect)) if v}
        self._override_until = dt_util.utcnow() + timedelta(minutes=minutes)

    def clear_override(self) -> None:
        self._override = {}
        self._override_until = None

    async def _async_update_data(self) -> dict[str, Any]:
        now = dt_util.now()
        period = self._period(now)
        condition, temperature = self._weather()
        weather_attrs = self._weather_attrs()
        effect = self._effect(condition, temperature)

        overridden = False
        if self._override_until and dt_util.utcnow() < self._override_until:
            period = self._override.get("period", period)
            effect = self._override.get("effect", effect)
            overridden = True
        else:
            self.clear_override()

        return {
            "period": period,
            "effect": effect,
            "condition": condition,
            "temperature": temperature,
            "overridden": overridden,
            "weather_attrs": weather_attrs,
            "options": {k: self.opts[k] for k in FRONTEND_KEYS},
        }

    # ---- period -------------------------------------------------------------------
    def _period(self, now: datetime) -> str:
        o = self.opts
        today = now.date()
        sunrise = get_astral_event_date(self.hass, "sunrise", today)
        sunset = get_astral_event_date(self.hass, "sunset", today)
        noon = get_astral_event_date(self.hass, "noon", today)
        if not (sunrise and sunset and noon):
            return self._period_by_clock(now)

        m = lambda v: timedelta(minutes=int(v))  # noqa: E731
        bounds = [
            ("night", sunrise - m(o["sunrise_before_min"])),
            ("sunrise", sunrise + m(o["sunrise_after_min"])),
            ("morning", noon - m(o["midday_half_width_min"])),
            ("midday", noon + m(o["midday_half_width_min"])),
            ("afternoon", sunset - m(o["evening_before_sunset_min"])),
            ("evening", sunset + m(o["evening_after_sunset_min"])),
        ]
        prev = None
        for name, end in bounds:
            if prev is not None and end < prev:
                end = prev  # keep the boundaries monotonic on very short days
            if now < end:
                return name
            prev = end
        return "night"

    @staticmethod
    def _period_by_clock(now: datetime) -> str:
        """Polar day/night fallback."""
        h = now.hour
        if h < 5:
            return "night"
        if h < 8:
            return "sunrise"
        if h < 11:
            return "morning"
        if h < 15:
            return "midday"
        if h < 18:
            return "afternoon"
        if h < 21:
            return "evening"
        return "night"

    # ---- weather ------------------------------------------------------------------
    def _weather(self) -> tuple[str | None, float | None]:
        condition = None
        temperature = None
        wid = self.opts["weather_entity"]
        if wid and (st := self.hass.states.get(wid)):
            if st.state not in (STATE_UNAVAILABLE, STATE_UNKNOWN):
                condition = st.state
            temperature = _to_float(st.attributes.get("temperature"))
        tid = self.opts["temperature_entity"]
        if tid and (st := self.hass.states.get(tid)):
            if (value := _to_float(st.state)) is not None:
                temperature = value
        return condition, temperature

    def _weather_attrs(self) -> dict[str, Any]:
        """Real-time details the frontend uses for clouds, wind and haze."""
        wid = self.opts["weather_entity"]
        st = self.hass.states.get(wid) if wid else None
        if st is None:
            return {}
        keys = (
            "cloud_coverage",
            "wind_speed",
            "wind_speed_unit",
            "wind_bearing",
            "visibility",
            "visibility_unit",
        )
        out: dict[str, Any] = {}
        for key in keys:
            value = st.attributes.get(key)
            if value is None:
                continue
            out[key] = value
        return out

    def _effect(self, condition: str | None, temperature: float | None) -> str:
        effect = CONDITION_EFFECT.get(condition or "", "clear")
        if effect == "partlycloudy":
            effect = self.opts["partlycloudy_as"]
        if (
            self.opts["rain_to_snow"]
            and effect in ("rain", "heavy_rain")
            and temperature is not None
            and temperature <= float(self.opts["rain_to_snow_temp"])
        ):
            effect = "snow"
        return effect


def _to_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
