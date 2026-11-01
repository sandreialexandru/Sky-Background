"""Sky Background: time-of-day + weather driven dashboard background and theme."""
from __future__ import annotations

import logging
from pathlib import Path

import voluptuous as vol

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv

from .const import DOMAIN, EFFECTS, JS_FILE, PERIODS, URL_BASE, VERSION
from .coordinator import SkyCoordinator

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
PLATFORMS = ["sensor"]

SERVICE_OVERRIDE = vol.Schema(
    {
        vol.Optional("period"): vol.In(PERIODS),
        vol.Optional("effect"): vol.In(EFFECTS),
        vol.Optional("duration", default=10): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=1440)
        ),
    }
)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Register the frontend module and the services once."""
    hass.data.setdefault(DOMAIN, {})

    frontend_dir = Path(__file__).parent / "frontend"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(URL_BASE, str(frontend_dir), cache_headers=False)]
    )
    add_extra_js_url(hass, f"{URL_BASE}/{JS_FILE}?v={VERSION}")

    def _coordinators() -> list[SkyCoordinator]:
        return [c for c in hass.data[DOMAIN].values() if isinstance(c, SkyCoordinator)]

    async def _override(call: ServiceCall) -> None:
        for coordinator in _coordinators():
            coordinator.set_override(
                call.data.get("period"), call.data.get("effect"), call.data["duration"]
            )
            await coordinator.async_request_refresh()

    async def _clear(call: ServiceCall) -> None:
        for coordinator in _coordinators():
            coordinator.clear_override()
            await coordinator.async_request_refresh()

    hass.services.async_register(DOMAIN, "override", _override, schema=SERVICE_OVERRIDE)
    hass.services.async_register(DOMAIN, "clear_override", _clear)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    coordinator = SkyCoordinator(hass, entry)
    await coordinator.async_config_entry_first_refresh()
    coordinator.async_start()
    hass.data[DOMAIN][entry.entry_id] = coordinator

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_reload))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return ok


async def _reload(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)
