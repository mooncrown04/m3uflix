export interface KeyMap {
  up: string;
  down: string;
  left: string;
  right: string;
  enter: string;
  back: string;
  settings: string;
  guide: string;
  voice: string;
  miniPlayer: string;
  playPause: string;
  volumeUp: string;
  volumeDown: string;
  channelUp: string;
  channelDown: string;
}

export function normalizeRemoteKey(
  e: { key: string; keyCode?: number; which?: number; preventDefault?: () => void },
  keyMap?: KeyMap
): string {
  let rawKey = e.key;
  const code = e.keyCode || e.which;

  // 1. Normalize based on keyCode / which (highly reliable for older TV boxes & custom Android firmwares)
  if (code) {
    if (code === 38) return 'ArrowUp';
    if (code === 40) return 'ArrowDown';
    if (code === 37) return 'ArrowLeft';
    if (code === 39) return 'ArrowRight';
    if (code === 13 || code === 66 || code === 23) return 'Enter'; // 13: Enter, 66: Android custom Enter, 23: D-pad center (Android TV select)
    if (code === 8 || code === 27 || code === 10009 || code === 461 || code === 4) return 'Backspace'; // Back buttons
    if (code === 33 || code === 427 || code === 166) return 'ChannelUp'; // PageUp or TV specific ChannelUp
    if (code === 34 || code === 428 || code === 167) return 'ChannelDown'; // PageDown or TV specific ChannelDown
    if (code === 24 || code === 447) return 'VolumeUp'; // Vol Up
    if (code === 25 || code === 448) return 'VolumeDown'; // Vol Down
    if (code === 179 || code === 126 || code === 127) return 'o'; // MediaPlayPause, Android play/pause
    if (code === 458 || code === 462) return 'g'; // Guide key
    if (code === 18 || code === 93 || code === 82) return 's'; // Menu keys (Tizen/LG/Android Menu)
  }

  // 2. Normalize based on raw key string value
  const lowerKey = rawKey ? rawKey.toLowerCase() : '';
  
  if (rawKey === 'Select' || rawKey === 'OK' || rawKey === 'Ok' || lowerKey === 'enter' || lowerKey === 'select' || lowerKey === 'ok') {
    return 'Enter';
  }

  if (lowerKey === 'arrowup' || lowerKey === 'up' || rawKey === 'UIKeyInputUp') {
    return 'ArrowUp';
  }
  if (lowerKey === 'arrowdown' || lowerKey === 'down' || rawKey === 'UIKeyInputDown') {
    return 'ArrowDown';
  }
  if (lowerKey === 'arrowleft' || lowerKey === 'left' || rawKey === 'UIKeyInputLeft') {
    return 'ArrowLeft';
  }
  if (lowerKey === 'arrowright' || lowerKey === 'right' || rawKey === 'UIKeyInputRight') {
    return 'ArrowRight';
  }

  if (
    lowerKey === 'backspace' || 
    lowerKey === 'escape' || 
    lowerKey === 'back' || 
    lowerKey === 'goback' || 
    lowerKey === 'browserback' || 
    lowerKey === 'xf86back'
  ) {
    return 'Backspace';
  }

  if (lowerKey === 'pageup' || lowerKey === 'channelup' || lowerKey === 'chup' || rawKey === 'ChannelUp' || rawKey === 'PageUp') {
    return 'ChannelUp';
  }
  if (lowerKey === 'pagedown' || lowerKey === 'channeldown' || lowerKey === 'chdown' || rawKey === 'ChannelDown' || rawKey === 'PageDown') {
    return 'ChannelDown';
  }

  if (lowerKey === 'volumeup' || lowerKey === 'volup' || rawKey === 'VolumeUp') {
    return 'VolumeUp';
  }
  if (lowerKey === 'volumedown' || lowerKey === 'voldown' || rawKey === 'VolumeDown') {
    return 'VolumeDown';
  }

  if (
    lowerKey === 'mediaplaypause' || 
    lowerKey === 'playpause' || 
    lowerKey === 'play' || 
    lowerKey === 'pause' || 
    lowerKey === 'mediaplay' || 
    lowerKey === 'mediapause'
  ) {
    return 'o'; // 'o' is our standard play/pause logical key
  }

  if (lowerKey === 'settings' || lowerKey === 'menu' || lowerKey === 'xf86menu' || lowerKey === 'xf86sysmenu') {
    return 's';
  }

  if (lowerKey === 'guide' || lowerKey === 'epg' || lowerKey === 'xf86guide' || lowerKey === 'xf86sysguide') {
    return 'g';
  }

  if (lowerKey === 'voice' || lowerKey === 'speech' || lowerKey === 'search') {
    return 'v';
  }

  // 3. Apply custom KeyMap overrides if provided
  if (keyMap) {
    if (rawKey === keyMap.up) return 'ArrowUp';
    if (rawKey === keyMap.down) return 'ArrowDown';
    if (rawKey === keyMap.left) return 'ArrowLeft';
    if (rawKey === keyMap.right) return 'ArrowRight';
    if (rawKey === keyMap.enter) return 'Enter';
    if (rawKey === keyMap.back) return 'Backspace';
    if (rawKey === keyMap.settings) return 's';
    if (rawKey === keyMap.guide) return 'g';
    if (rawKey === keyMap.voice) return 'v';
    if (rawKey === keyMap.miniPlayer) return 'm';
    if (rawKey === keyMap.playPause) return 'o';
    if (rawKey === keyMap.volumeUp) return 'VolumeUp';
    if (rawKey === keyMap.volumeDown) return 'VolumeDown';
    if (rawKey === keyMap.channelUp) return 'ChannelUp';
    if (rawKey === keyMap.channelDown) return 'ChannelDown';
  }

  return rawKey;
}
