# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). While the major version is 0, minor versions can include breaking changes.

## [Unreleased]

## [0.2.0] - 2026-11-01

### Added
- Cloud height: choose how high the highest clouds sit and how low the lowest ones reach, as a share of the screen height.

## [0.1.0] - 2026-11-01

First public version.

### Added
- Time-of-day periods (night, sunrise, morning, midday, afternoon, evening) computed from the sun, with adjustable lengths.
- Weather effects drawn on a canvas: rain, heavy rain, storm with lightning, snow, sleet, hail, fog.
- Sun and moon placed from the exact time and the Home Assistant location, on a rise-to-set arc or the real compass direction. The moon shows its real phase. A time offset previews other times of day.
- Clouds, wind and haze from the weather entity (`cloud_coverage`, `wind_speed`, `wind_bearing`, `visibility`), with fallbacks when they are missing.
- Stars that depend on the real sun elevation and the cloud cover.
- Background modes: auto (set a background only when no theme defines one, otherwise draw the glows as an overlay), always, overlay only, off.
- Effects drawn behind the cards, over the dashboard background (or above the cards).
- Universal opacity, a height limit for the sky elements and a lowest point for rain and snow.
- Scope: all dashboards, only the listed ones or all except the listed ones, optionally other pages, optionally only for selected themes.
- Performance options: frame rate cap, pause when hidden, reduced motion, weak-device reduction, off on phones.
- Config flow with a menu of six option pages, English and Romanian translations.
- Sensors `sensor.sky_background_period` and `sensor.sky_background_effect`, services `sky_background.override` and `sky_background.clear_override`.
- Integration icon.

### Notes
- The integration never changes your theme or your cards.

[Unreleased]: https://github.com/sandreialexandru/Sky-Background/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/sandreialexandru/Sky-Background/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sandreialexandru/Sky-Background/releases/tag/v0.1.0
