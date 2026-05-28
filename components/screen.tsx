import { StatusBar } from 'expo-status-bar'
import { ReactNode } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type Props = {
  children: ReactNode
}

export function Screen({ children }: Props) {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      {children}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F1EA'
  }
})
