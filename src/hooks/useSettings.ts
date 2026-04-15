import { useState, useEffect, useCallback, useMemo } from 'react';
import { UIMode, LayoutMode, LogoStyle, FocusEffect, Top10Style } from '../types';
import { PROFILE_PICS } from '../constants';

export function useSettings() {
  const [themeColor, setThemeColor] = useState<string>(() => localStorage.getItem('theme_color') || '#dc2626');
  const [uiMode, setUiMode] = useState<UIMode>(() => {
    const saved = localStorage.getItem('ui_mode');
    return (saved as UIMode) || 'modern';
  });
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    const saved = localStorage.getItem('layout_mode');
    return (saved as LayoutMode) || 'scroll';
  });
  const [logoStyle, setLogoStyle] = useState<LogoStyle>(() => {
    const saved = localStorage.getItem('logo_style');
    return (saved as LogoStyle) || 'default';
  });
  const [focusEffect, setFocusEffect] = useState<FocusEffect>(() => {
    const saved = localStorage.getItem('focus_effect');
    return (saved as FocusEffect) || 'default';
  });
  const [posterOrientation, setPosterOrientation] = useState<'landscape' | 'portrait'>(() => 
    (localStorage.getItem('poster_orientation') as 'landscape' | 'portrait') || 'landscape'
  );
  const [clockStyle, setClockStyle] = useState<'original' | 'horizontal' | 'minimal' | 'retro' | 'modern'>(() => 
    (localStorage.getItem('clock_style') as any) || 'original'
  );
  const [top10Style, setTop10Style] = useState<Top10Style>(() => 
    (localStorage.getItem('top10_style') as Top10Style) || 'original'
  );
  const [profilePic, setProfilePic] = useState<string>(() => 
    localStorage.getItem('profile_pic') || PROFILE_PICS[0]
  );
  const [deviceType, setDeviceType] = useState<'pc' | 'tv' | 'tablet' | 'phone'>(() => 
    (localStorage.getItem('device_type') as 'pc' | 'tv' | 'tablet' | 'phone') || 'pc'
  );
  const [dynamicThemeEnabled, setDynamicThemeEnabled] = useState(() => 
    localStorage.getItem('dynamic_theme_enabled') === 'true'
  );
  const [voiceControlEnabled, setVoiceControlEnabled] = useState(() => 
    localStorage.getItem('voice_control_enabled') !== 'false'
  );
  const [cinemaModeEnabled, setCinemaModeEnabled] = useState(() => 
    localStorage.getItem('cinema_mode_enabled') !== 'false'
  );
  const [tmdbEnabled, setTmdbEnabled] = useState(() => 
    localStorage.getItem('tmdb_enabled') !== 'false'
  );
  const [tmdbApiKey, setTmdbApiKey] = useState<string>(() => 
    localStorage.getItem('tmdb_api_key') || ''
  );
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => 
    localStorage.getItem('gemini_api_key') || ''
  );
  const [customProxyUrl, setCustomProxyUrl] = useState<string>(() => 
    localStorage.getItem('custom_proxy_url') || ''
  );
  const [playerEngine, setPlayerEngine] = useState<'hls' | 'shaka'>(() => 
    (localStorage.getItem('player_engine') as 'hls' | 'shaka') || 'hls'
  );
  const [ambilightMode, setAmbilightMode] = useState<'none' | 'soft' | 'vibrant' | 'cinema'>(() => 
    (localStorage.getItem('ambilight_mode') as any) || 'soft'
  );

  const [mixColor1, setMixColor1] = useState<string>(() => localStorage.getItem('mix_color_1') || '#dc2626');
  const [mixColor2, setMixColor2] = useState<string>(() => localStorage.getItem('mix_color_2') || '#2563eb');

  const mixedColor = useMemo(() => {
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };

    const rgbToHex = (r: number, g: number, b: number) => {
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };

    const c1 = hexToRgb(mixColor1);
    const c2 = hexToRgb(mixColor2);

    return rgbToHex(
      Math.round((c1.r + c2.r) / 2),
      Math.round((c1.g + c2.g) / 2),
      Math.round((c1.b + c2.b) / 2)
    );
  }, [mixColor1, mixColor2]);

  useEffect(() => {
    localStorage.setItem('mix_color_1', mixColor1);
  }, [mixColor1]);

  useEffect(() => {
    localStorage.setItem('mix_color_2', mixColor2);
  }, [mixColor2]);

  useEffect(() => {
    localStorage.setItem('theme_color', themeColor);
  }, [themeColor]);

  useEffect(() => {
    localStorage.setItem('ui_mode', uiMode);
  }, [uiMode]);

  useEffect(() => {
    localStorage.setItem('layout_mode', layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    localStorage.setItem('logo_style', logoStyle);
  }, [logoStyle]);

  useEffect(() => {
    localStorage.setItem('focus_effect', focusEffect);
  }, [focusEffect]);

  useEffect(() => {
    localStorage.setItem('poster_orientation', posterOrientation);
  }, [posterOrientation]);

  useEffect(() => {
    localStorage.setItem('clock_style', clockStyle);
  }, [clockStyle]);

  useEffect(() => {
    localStorage.setItem('top10_style', top10Style);
  }, [top10Style]);

  useEffect(() => {
    localStorage.setItem('profile_pic', profilePic);
  }, [profilePic]);

  useEffect(() => {
    localStorage.setItem('device_type', deviceType);
  }, [deviceType]);

  useEffect(() => {
    localStorage.setItem('dynamic_theme_enabled', String(dynamicThemeEnabled));
  }, [dynamicThemeEnabled]);

  useEffect(() => {
    localStorage.setItem('voice_control_enabled', String(voiceControlEnabled));
  }, [voiceControlEnabled]);

  useEffect(() => {
    localStorage.setItem('cinema_mode_enabled', String(cinemaModeEnabled));
  }, [cinemaModeEnabled]);

  useEffect(() => {
    localStorage.setItem('tmdb_enabled', String(tmdbEnabled));
  }, [tmdbEnabled]);

  useEffect(() => {
    localStorage.setItem('tmdb_api_key', tmdbApiKey);
  }, [tmdbApiKey]);

  useEffect(() => {
    localStorage.setItem('gemini_api_key', geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    localStorage.setItem('custom_proxy_url', customProxyUrl);
  }, [customProxyUrl]);

  useEffect(() => {
    localStorage.setItem('player_engine', playerEngine);
  }, [playerEngine]);

  useEffect(() => {
    localStorage.setItem('ambilight_mode', ambilightMode);
  }, [ambilightMode]);

  return {
    themeColor, setThemeColor,
    uiMode, setUiMode,
    layoutMode, setLayoutMode,
    logoStyle, setLogoStyle,
    focusEffect, setFocusEffect,
    posterOrientation, setPosterOrientation,
    clockStyle, setClockStyle,
    top10Style, setTop10Style,
    profilePic, setProfilePic,
    deviceType, setDeviceType,
    dynamicThemeEnabled, setDynamicThemeEnabled,
    voiceControlEnabled, setVoiceControlEnabled,
    cinemaModeEnabled, setCinemaModeEnabled,
    tmdbEnabled, setTmdbEnabled,
    tmdbApiKey, setTmdbApiKey,
    geminiApiKey, setGeminiApiKey,
    customProxyUrl, setCustomProxyUrl,
    playerEngine, setPlayerEngine,
    ambilightMode, setAmbilightMode,
    mixColor1, setMixColor1,
    mixColor2, setMixColor2,
    mixedColor,
    PROFILE_PICS
  };
}
