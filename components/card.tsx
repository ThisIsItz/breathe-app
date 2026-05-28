import { useAppTheme } from '@/hooks/use-app-theme'
import { ReactNode } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'

type Props = {
  children: ReactNode
  style?: ViewStyle
}

export function Card({ children, style }: Props) {
  const c = useAppTheme()
  return (
    <View style={[styles.card, { backgroundColor: c.bgCard }, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 6
  }
})
