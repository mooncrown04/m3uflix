import React, { useState, useEffect } from 'react';

interface WeatherWidgetProps {
  city: string;
  themeColor: string;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ city, themeColor }) => {
  const [weather, setWeather] = useState<{ temp: number, code: number, isDay: number } | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          const { latitude, longitude } = geoData.results[0];
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const weatherData = await weatherRes.json();
          setWeather({
            temp: Math.round(weatherData.current_weather.temperature),
            code: weatherData.current_weather.weathercode,
            isDay: weatherData.current_weather.is_day
          });
        }
      } catch (err) {
        console.error('Weather fetch failed:', err);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 1800000);
    return () => clearInterval(interval);
  }, [city]);

  const getEmoji = (code: number, isDay: number) => {
    const isNight = isDay === 0;
    
    if (isNight) {
      if (code === 0) return '🌙'; // Açık Gece
      if (code >= 1 && code <= 3) return '☁️'; // Bulutlu Gece
      if (code >= 45 && code <= 48) return '🌫️'; // Sisli
      if (code >= 51 && code <= 67) return '🌧️'; // Yağmurlu
      if (code >= 71 && code <= 77) return '🌨️'; // Karlı
      if (code >= 80 && code <= 82) return '🌧️'; // Sağanak
      if (code >= 95 && code <= 99) return '⛈️'; // Fırtına
      return '🌙';
    } else {
      if (code === 0) return '☀️'; // Açık
      if (code >= 1 && code <= 3) return '🌤️'; // Az Bulutlu
      if (code >= 45 && code <= 48) return '🌫️'; // Sisli
      if (code >= 51 && code <= 67) return '🌦️'; // Yağmurlu
      if (code >= 71 && code <= 77) return '🌨️'; // Karlı
      if (code >= 80 && code <= 82) return '🌦️'; // Sağanak
      if (code >= 95 && code <= 99) return '⛈️'; // Fırtına
      return '☀️';
    }
  };

  if (!weather) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md mr-4">
      <span className="text-xl">{getEmoji(weather.code, weather.isDay)}</span>
      <div className="flex flex-col leading-none">
        <span style={{ color: themeColor }} className="text-sm font-black italic">{weather.temp}°C</span>
        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">{city}</span>
      </div>
    </div>
  );
};
