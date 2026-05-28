import { AppColors } from '@/constants/theme'
import { useColorScheme } from 'react-native'

export function useAppTheme() {
  const scheme = useColorScheme() ?? 'light'
  return AppColors[scheme]
}
