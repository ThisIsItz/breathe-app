import { Card } from '@/components/card'
import { Screen } from '@/components/screen'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function StatsScreen() {
  const [sessionsToday, setSessionsToday] = useState(0)
  const [sessionsTotal, setSessionsTotal] = useState(0)

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('anchor:sessionsLog')
        .then((raw) => {
          const log: string[] = raw ? JSON.parse(raw) : []
          const today = todayISO()
          setSessionsToday(log.filter((d) => d === today).length)
          setSessionsTotal(log.length)
        })
        .catch(() => {})
    }, [])
  )

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.heading}>Stats</Text>

        <Card>
          <Text style={styles.number}>{sessionsToday}</Text>
          <Text style={styles.label}>
            {sessionsToday === 1 ? 'session' : 'sessions'} today
          </Text>
        </Card>

        <Card>
          <Text style={styles.number}>{sessionsTotal}</Text>
          <Text style={styles.label}>
            {sessionsTotal === 1 ? 'session' : 'sessions'} total
          </Text>
        </Card>

        <Text style={styles.placeholder}>More stats coming soon.</Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
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
