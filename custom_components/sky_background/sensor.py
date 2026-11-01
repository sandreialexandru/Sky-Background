"""Period and effect sensors."""
from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, EFFECTS, PERIODS
from .coordinator import SkyCoordinator


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator: SkyCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([SkyPeriodSensor(coordinator), SkyEffectSensor(coordinator)])


class _Base(CoordinatorEntity[SkyCoordinator], SensorEntity):
    _attr_has_entity_name = True
    _attr_device_class = SensorDeviceClass.ENUM

    def __init__(self, coordinator: SkyCoordinator, key: str) -> None:
        super().__init__(coordinator)
        self._key = key
        self._attr_translation_key = key
        self._attr_unique_id = f"{coordinator.entry.entry_id}_{key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, coordinator.entry.entry_id)},
            name="Sky Background",
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def native_value(self) -> str | None:
        return self.coordinator.data.get(self._key) if self.coordinator.data else None


class SkyPeriodSensor(_Base):
    """Carries the options for the frontend module as attributes."""

    _attr_options = PERIODS

    def __init__(self, coordinator: SkyCoordinator) -> None:
        super().__init__(coordinator, "period")

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        data = self.coordinator.data or {}
        return {
            "weather_condition": data.get("condition"),
            "temperature": data.get("temperature"),
            "overridden": data.get("overridden"),
            "options": data.get("options", {}),
        }


class SkyEffectSensor(_Base):
    _attr_options = EFFECTS

    def __init__(self, coordinator: SkyCoordinator) -> None:
        super().__init__(coordinator, "effect")
