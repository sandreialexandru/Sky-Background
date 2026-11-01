# Sky Background

A Home Assistant integration that gives your dashboards a background and a palette that follow the **time of day** and the **weather**: dawn, morning, midday, afternoon, evening and night glows, plus rain, heavy rain, storms, snow, sleet, hail, fog, clouds and stars drawn as real particles (not CSS lines).

- **Time of day** picks the palette (computed from the sun, adjustable).
- **Weather** adds particles and dims the background (from any `weather` entity).
- The border-only palette and the Bubble Card variables are applied by the integration, so no theme file is needed. It works on top of whatever theme is selected, or only for the themes you list.
- Everything is configured from the UI.

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
| Weather effects | effects on/off, rain and snow density and speed, wind tilt, extra density for heavy rain, ripples, lightning, stars, drifting clouds, fog, effect opacity |
| Performance | maximum frame rate, pause when the tab is hidden, respect reduced motion, halve effects on weak devices, turn effects off on phones |
| Where it applies | all dashboards, only the listed ones, or all except the listed ones; only when one of the listed themes is selected |
| Theme and background | time-of-day background on/off, border-only palette and Bubble Card variables on/off, dark/light/auto, glow intensity, weather dimming, dotted texture, extra CSS variables as JSON |

### Extra CSS variables

Applied last, so they win over everything else:

```json
{ "dash-on": "#FFB300", "bubble-border-radius": "24px" }
```

## Services

| Service | Use |
| --- | --- |
| `sky_background.override` | Force a `period` and/or `effect` for `duration` minutes, to preview a look. |
| `sky_background.clear_override` | Go back to the real time of day and weather. |

## Notes

- Particles are drawn on a canvas above the dashboard, with pointer events disabled. Lower **Effect opacity** if you want them subtler.
- Home Assistant's own theme is not modified. The integration sets CSS variables on the page and removes them if you turn the options off.
- Needs Home Assistant 2025.1 or newer.
