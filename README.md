# Sky Background

A Home Assistant integration that adds a background glow and weather effects that follow the **time of day** and the **weather**: dawn, morning, midday, afternoon, evening and night glows, plus rain, heavy rain, storms, snow, sleet, hail, fog, clouds and stars drawn as real particles (not CSS lines).

- **Time of day** picks the glow colors (computed from the sun, adjustable).
- **Weather** adds particles and dims the glow (from any `weather` entity).
- It **never changes your theme or your cards**. If your theme or dashboard has no background, it sets one; if it already has one, the glows are drawn as a light overlay instead.
- Works on any dashboard and any theme. Everything is configured from the UI.

## How it looks

- **Sun and moon** are placed from the exact time and your Home Assistant location, so time zone and daylight saving are handled automatically. By default they travel along an arc from the left edge at rise to the right edge at set (highest at the peak, so it follows the real day length in every season). Switch to the real compass direction in the options, or shift them in time to preview sunset. The sun turns orange near the horizon. The moon shows its real phase. Heavy cloud, rain or fog dims them.
- **Clouds** are generated soft shapes. Their amount follows the weather entity's `cloud_coverage`, and their color follows the light (warm at dawn and dusk, blue-grey at night, darker in rain and storms).
- **Wind** speed and direction (`wind_speed`, `wind_bearing`) tilt the rain and push snow and clouds. **Visibility** adds haze. Each can be turned off.
- Stars show only when the sun is well below the horizon and the sky is clear.

## Install

### HACS (custom repository)

1. HACS → Integrations → ⋮ → Custom repositories → add this repository, category **Integration**.
2. Install **Sky Background** and restart Home Assistant.
3. Settings → Devices & services → Add integration → **Sky Background**, then pick your weather entity.

### Manual

Copy `custom_components/sky_background` into your `config/custom_components` folder and restart.

Hard-refresh the browser (or reload the app) once so the frontend module loads.

## What it creates

| Entity | Values |
| --- | --- |
| `sensor.sky_background_period` | `night`, `sunrise`, `morning`, `midday`, `afternoon`, `evening` |
| `sensor.sky_background_effect` | `clear`, `cloudy`, `fog`, `rain`, `heavy_rain`, `storm`, `snow`, `sleet`, `hail` |

Use them in automations too. The period sensor also carries `weather_condition`, `temperature` and `overridden` attributes.

## Options

Open the integration and choose **Configure**. Pages are saved together with **Save and close**.

| Page | Options |
| --- | --- |
| Weather source and mapping | weather entity, outdoor temperature sensor, treat *partly cloudy* as clear or cloudy, turn rain into snow below a temperature |
| Time-of-day periods | minutes before/after sunrise, half-width of midday around solar noon, when evening starts before sunset and how long it lasts after |
| Weather effects | effects on/off, rain and snow density and speed, wind tilt, extra density for heavy rain, ripples, lightning, stars, drifting clouds, fog, effect opacity, draw behind or above the cards, sun and moon (size, opacity), cloud amount, wind and haze taken from the weather entity |
| Performance | maximum frame rate, pause when the tab is hidden, respect reduced motion, halve effects on weak devices, turn effects off on phones |
| Where it applies | all dashboards, only the listed ones, or all except the listed ones; optionally on other pages too (history, map, settings); only when one of the listed themes is selected |
| Background | background mode (auto, always, overlay only, off), overlay intensity, dark/light/auto, glow intensity, weather dimming, dotted texture |

## Services

| Service | Use |
| --- | --- |
| `sky_background.override` | Force a `period` and/or `effect` for `duration` minutes, to preview a look. |
| `sky_background.clear_override` | Go back to the real time of day and weather. |

## Notes

- In **Auto** mode a background is set only if no theme defines one. Dashboards that paint their own view background can hide it: use **Overlay only** there.
- By default the effects are drawn **behind the cards, over the dashboard background** (they show through translucent cards and around them). Choose *Above the cards* to draw them over everything. Pointer events are always disabled.
- Nothing in your theme is modified. The integration may set `--lovelace-background` on the page (Auto/Always) and removes it if you turn the option off.
- Needs Home Assistant 2025.1 or newer.
