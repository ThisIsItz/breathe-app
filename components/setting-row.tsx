import { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

type Props = {
  label: string
  children: ReactNode
}

export function SettingRow({ label, children }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: 12
  },
  label: {
    color: '#9AA49E',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  }
})
