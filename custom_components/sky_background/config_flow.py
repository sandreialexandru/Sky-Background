"""Config flow with a menu of option pages."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers import selector as sel

from .const import DEFAULTS, DOMAIN
from .coordinator import merged_options


def _num(lo: float, hi: float, step: float = 1, unit: str | None = None) -> sel.NumberSelector:
    return sel.NumberSelector(
        sel.NumberSelectorConfig(
            min=lo,
            max=hi,
            step=step,
            unit_of_measurement=unit,
            mode=sel.NumberSelectorMode.BOX,
        )
    )


def _choice(options: list[str], key: str) -> sel.SelectSelector:
    return sel.SelectSelector(
        sel.SelectSelectorConfig(
            options=options,
            translation_key=key,
            mode=sel.SelectSelectorMode.DROPDOWN,
        )
    )


_BOOL = sel.BooleanSelector()
_TEXT = sel.TextSelector()
_WEATHER = sel.EntitySelector(sel.EntitySelectorConfig(domain="weather"))
_TEMP = sel.EntitySelector(
    sel.EntitySelectorConfig(domain="sensor", device_class="temperature")
)

# page -> {key: selector}
PAGES: dict[str, dict[str, Any]] = {
    "weather": {
        "weather_entity": _WEATHER,
        "temperature_entity": _TEMP,
        "partlycloudy_as": _choice(["clear", "cloudy"], "partlycloudy_as"),
        "rain_to_snow": _BOOL,
        "rain_to_snow_temp": _num(-15, 10, 0.5, "°C"),
    },
    "periods": {
        "sunrise_before_min": _num(0, 180, 5, "min"),
        "sunrise_after_min": _num(0, 360, 5, "min"),
        "midday_half_width_min": _num(30, 360, 5, "min"),
        "evening_before_sunset_min": _num(0, 360, 5, "min"),
        "evening_after_sunset_min": _num(0, 360, 5, "min"),
    },
    "effects": {
        "effects_enabled": _BOOL,
        "rain_density": _num(10, 300, 5, "%"),
        "snow_density": _num(10, 300, 5, "%"),
        "rain_speed": _num(30, 250, 5, "%"),
        "snow_speed": _num(30, 250, 5, "%"),
        "wind": _num(-100, 100, 5, "%"),
        "heavy_rain_multiplier": _num(100, 400, 10, "%"),
        "ripples": _BOOL,
        "lightning": _BOOL,
        "stars": _BOOL,
        "clouds": _BOOL,
        "fog": _BOOL,
        "particle_opacity": _num(10, 100, 5, "%"),
        "layer": _choice(["behind", "above"], "layer"),
        "sky_path": _choice(["arc", "azimuth"], "sky_path"),
        "sky_time_offset_min": _num(-720, 720, 5, "min"),
        "show_sun": _BOOL,
        "show_moon": _BOOL,
        "sun_size": _num(40, 250, 10, "%"),
        "moon_size": _num(40, 250, 10, "%"),
        "sky_objects_opacity": _num(10, 100, 5, "%"),
        "use_real_clouds": _BOOL,
        "use_real_wind": _BOOL,
        "use_real_visibility": _BOOL,
    },
    "performance": {
        "max_fps": _num(10, 60, 5, "fps"),
        "pause_when_hidden": _BOOL,
        "respect_reduced_motion": _BOOL,
        "auto_reduce_weak_devices": _BOOL,
        "disable_on_mobile": _BOOL,
    },
    "scope": {
        "everywhere": _BOOL,
        "dashboards_mode": _choice(["all", "include", "exclude"], "dashboards_mode"),
        "dashboards": _TEXT,
        "only_theme_names": _TEXT,
    },
    "appearance": {
        "background_mode": _choice(["auto", "always", "overlay", "off"], "background_mode"),
        "overlay_intensity": _num(10, 100, 5, "%"),
        "color_mode": _choice(["auto", "dark", "light"], "color_mode"),
        "background_intensity": _num(0, 200, 5, "%"),
        "weather_dimming": _num(0, 200, 5, "%"),
        "show_dots": _BOOL,
    },
}


def _schema(page: str, current: dict[str, Any]) -> vol.Schema:
    fields: dict[Any, Any] = {}
    for key, selector in PAGES[page].items():
        default = current.get(key, DEFAULTS[key])
        optional_entity = key in ("temperature_entity",)
        if key == "weather_entity":
            marker: Any = vol.Required(key, default=default or vol.UNDEFINED)
        elif optional_entity:
            marker = vol.Optional(key, description={"suggested_value": default or None})
        else:
            marker = vol.Optional(key, default=default)
        fields[marker] = selector
    return vol.Schema(fields)


def _clean(user_input: dict[str, Any]) -> dict[str, Any]:
    out = dict(user_input)
    for key in ("temperature_entity", "dashboards", "only_theme_names"):
        if key in out and out[key] is None:
            out[key] = ""
    for key, value in list(out.items()):
        if isinstance(DEFAULTS.get(key), int) and not isinstance(DEFAULTS[key], bool):
            out[key] = int(value)
    return out


def _validate(page: str, user_input: dict[str, Any]) -> dict[str, str]:
    errors: dict[str, str] = {}
    if page == "scope" and user_input.get("dashboards_mode") != "all":
        if not (user_input.get("dashboards") or "").strip():
            errors["dashboards"] = "dashboards_required"
    return errors


class SkyConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        errors: dict[str, str] = {}
        if user_input is not None:
            return self.async_create_entry(title="Sky Background", data=_clean(user_input))
        schema = vol.Schema(
            {
                vol.Required("weather_entity"): _WEATHER,
                vol.Optional("temperature_entity"): _TEMP,
            }
        )
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry) -> SkyOptionsFlow:  # noqa: ANN001
        return SkyOptionsFlow()


class SkyOptionsFlow(OptionsFlow):
    """Menu with one page per topic; Save writes everything at once."""

    def __init__(self) -> None:
        self._opts: dict[str, Any] | None = None

    @property
    def opts(self) -> dict[str, Any]:
        if self._opts is None:
            self._opts = merged_options(self.config_entry)
        return self._opts

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        return self.async_show_menu(
            step_id="init",
            menu_options=[*PAGES.keys(), "save"],
        )

    async def _page(self, page: str, user_input: dict[str, Any] | None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            if page == "weather":
                user_input.setdefault("temperature_entity", "")
            errors = _validate(page, user_input)
            if not errors:
                self.opts.update(_clean(user_input))
                return await self.async_step_init()
        current = {**self.opts, **(user_input or {})}
        return self.async_show_form(
            step_id=page, data_schema=_schema(page, current), errors=errors
        )

    async def async_step_weather(self, user_input=None):  # noqa: ANN001
        return await self._page("weather", user_input)

    async def async_step_periods(self, user_input=None):  # noqa: ANN001
        return await self._page("periods", user_input)

    async def async_step_effects(self, user_input=None):  # noqa: ANN001
        return await self._page("effects", user_input)

    async def async_step_performance(self, user_input=None):  # noqa: ANN001
        return await self._page("performance", user_input)

    async def async_step_scope(self, user_input=None):  # noqa: ANN001
        return await self._page("scope", user_input)

    async def async_step_appearance(self, user_input=None):  # noqa: ANN001
        return await self._page("appearance", user_input)

    async def async_step_save(self, user_input=None):  # noqa: ANN001
        return self.async_create_entry(title="", data=self.opts)
