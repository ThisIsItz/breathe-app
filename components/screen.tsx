import { useAppTheme } from '@/hooks/use-app-theme'
import { StatusBar } from 'expo-status-bar'
import { ReactNode } from 'react'
import { StyleSheet, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type Props = {
  children: ReactNode
}

export function Screen({ children }: Props) {
  const c = useAppTheme()
  const colorScheme = useColorScheme()
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
})
