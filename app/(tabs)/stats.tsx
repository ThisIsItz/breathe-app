import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function StatsScreen() {
  const [completedSessions, setCompletedSessions] = useState(0)

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('anchor:completedSessions')
        .then((v) => {
          if (v !== null) setCompletedSessions(parseInt(v, 10))
        })
        .catch(() => {})
    }, [])
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Text style={styles.heading}>Stats</Text>

        <View style={styles.card}>
          <Text style={styles.number}>{completedSessions}</Text>
          <Text style={styles.label}>
            {completedSessions === 1 ? 'session' : 'sessions'} today
          </Text>
        </View>

        <Text style={styles.placeholder}>More stats coming soon.</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F1EA'
  },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 48,
    gap: 32
  },
  heading: {
    color: '#1F2A24',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.8
  },
  card: {
    backgroundColor: '#E5E0D7',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 6
  },
  number: {
    color: '#2E5E4E',
    fontSize: 72,
    fontWeight: '700',
    lineHeight: 80
  },
  label: {
    color: '#55635C',
    fontSize: 16,
    fontWeight: '500'
  },
  placeholder: {
    color: '#9AA49E',
    fontSize: 14,
    fontWeight: '500'
  }
})
