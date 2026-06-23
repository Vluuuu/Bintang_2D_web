import type { TimeTheme } from './timeTheme';

export interface ThemeAssetMap {
  city: string;
  landmarks: Record<string, string>;
}

export const themeAssets: Record<TimeTheme, ThemeAssetMap> = {
  day: {
    city: 'assets/backgrounds/day/bg_city_day_loop.png',
    landmarks: {
      'upnvj': 'assets/backgrounds/day/upnvj_day.png',
      'lenteng': 'assets/backgrounds/day/lenteng_day.png',
      'ps-gacor': 'assets/backgrounds/day/ps_gacor_day.png',
      'blok-m': 'assets/backgrounds/day/blok_m_landmark.png', // Audited filename
      'goa': '/assets/backgrounds/day/goa_day.png',
    }
  },
  sunset: {
    city: 'assets/backgrounds/sunset/bg_city_sunset_loop.png',
    landmarks: {
      'upnvj': 'assets/backgrounds/sunset/upnvj_sunset.png',
      'lenteng': 'assets/backgrounds/sunset/lenteng_sunset.png',
      'ps-gacor': 'assets/backgrounds/sunset/ps_gacor_sunset.png',
      'blok-m': 'assets/backgrounds/sunset/blok_m_sunset_landmark.png', // Audited filename
      'goa': '/assets/backgrounds/sunset/goa_sunset.png',
    }
  },
  night: {
    city: 'assets/backgrounds/night/bg_city_night_loop.png',
    landmarks: {
      'upnvj': 'assets/backgrounds/night/upnvj_night.png',
      'lenteng': 'assets/backgrounds/night/lenteng_night.png',
      'ps-gacor': 'assets/backgrounds/night/ps_gacor_night.png',
      'blok-m': 'assets/backgrounds/night/blok_m_night_landmark.png', // Audited filename
      'goa': '/assets/backgrounds/night/goa_night.png',
    }
  }
};

// Bike frame paths + placement config live in ./bike.ts
