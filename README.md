# SkyCast – Weather Forecast App

A responsive weather app built with **React** and **Vite**. Search any city and get the current conditions, a 24-hour temperature chart, and a 7-day forecast, using the free [Open-Meteo](https://open-meteo.com) API (no API key needed).

**Live demo:** [https://ahmedkhadega979-cloud.github.io/skycast.code/](https://ahmedkhadega979-cloud.github.io/skycast.code/)

## Features
- City search with debounced autocomplete (geocoding API) and "use my location"
- Current weather, feels-like temperature, humidity, wind, and rain chance
- 24-hour temperature line chart (hand-built SVG) and 7-day forecast
- °C / °F toggle, recent cities, and preferences saved in `localStorage`
- Background theme changes with the weather and time of day
- Loading, error, and retry states; request cancellation with `AbortController`
- Fully responsive, keyboard accessible, ARIA labels, reduced-motion support

## Tech
React 18 (hooks, custom `useStored` hook), Fetch API, Vite, CSS custom properties.

## Source code
The full React source is in the [`source`](./source) folder.

## Run locally
```bash
cd source
npm install
npm run dev
```
