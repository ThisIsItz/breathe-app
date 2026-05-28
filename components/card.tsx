import { ReactNode } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'

type Props = {
  children: ReactNode
  style?: ViewStyle
}

export function Card({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#E5E0D7',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 6
  }
})
