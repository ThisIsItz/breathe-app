import { useAppTheme } from '@/hooks/use-app-theme'
import { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

type Props = {
  label: string
  children: ReactNode
}

export function SettingRow({ label, children }: Props) {
  const c = useAppTheme()
  return (
    <View style={styles.section}>
      <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: 12
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  }
})
