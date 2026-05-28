/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native'

const tintColorLight = '#0a7ea4'
const tintColorDark = '#fff'

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark
  }
}

export const AppColors = {
  light: {
    bg: '#F5F1EA',
    bgCard: '#E5E0D7',
    bgList: '#EDE8DF',
    primary: '#2E5E4E',
    textDark: '#1F2A24',
    textBody: '#55635C',
    textMuted: '#9AA49E',
    textFaint: '#B8B2A8',
    textOnPrimary: '#F8F6F2',
    pillText: '#3A4942',
    border: '#D5CFC6',
    borderTab: '#E5E0D7',
    dot: '#C8C2B8',
    modalOverlay: 'rgba(0,0,0,0.35)',
    circleOpacityOuter: 0.07,
    circleOpacityInner: 0.13,
    circleOpacityMain: 0.2
  },
  dark: {
    bg: '#181F1D',
    bgCard: '#222B28',
    bgList: '#293330',
    primary: '#52947A',
    textDark: '#E2EAE6',
    textBody: '#8AA49B',
    textMuted: '#516A62',
    textFaint: '#3D5750',
    textOnPrimary: '#F8F6F2',
    pillText: '#9AB5AC',
    border: '#2D3E39',
    borderTab: '#222B28',
    dot: '#3A4E47',
    modalOverlay: 'rgba(0,0,0,0.55)',
    circleOpacityOuter: 0.18,
    circleOpacityInner: 0.32,
    circleOpacityMain: 0.45
  }
}

export type AppTheme = typeof AppColors.light

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace'
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace'
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
  }
})
