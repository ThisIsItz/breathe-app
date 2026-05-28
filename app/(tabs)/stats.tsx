import { Card } from '@/components/card'
import { Screen } from '@/components/screen'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

const BAR_MAX_HEIGHT = 64
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function offsetISO(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayLabel(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return DAY_ABBR[d.getDay()]
}

function computeStreak(log: string[]): number {
  const dates = new Set(log)
  const today = todayISO()
  let streak = 0
  let daysAgo = dates.has(today) ? 0 : 1
  while (true) {
    const date = offsetISO(daysAgo)
    if (dates.has(date)) {
      streak++
      daysAgo++
    } else {
      break
    }
  }
  return streak
}

type WeekDay = { date: string; count: number; label: string; isToday: boolean }

function buildWeekData(log: string[]): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const daysAgo = 6 - i
    const date = offsetISO(daysAgo)
    return {
      date,
      count: log.filter((d) => d === date).length,
      label: dayLabel(daysAgo),
      isToday: daysAgo === 0
    }
  })
}

export default function StatsScreen() {
  const [sessionsToday, setSessionsToday] = useState(0)
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0)
  const [streak, setStreak] = useState(0)
  const [weekData, setWeekData] = useState<WeekDay[]>(() => buildWeekData([]))

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('anchor:sessionsLog')
        .then((raw) => {
          const log: string[] = raw ? JSON.parse(raw) : []
          const today = todayISO()
          const week = buildWeekData(log)
          setSessionsToday(log.filter((d) => d === today).length)
          setSessionsThisWeek(week.reduce((sum, d) => sum + d.count, 0))
          setStreak(computeStreak(log))
          setWeekData(week)
        })
        .catch(() => {})
    }, [])
  )

  const maxCount = Math.max(...weekData.map((d) => d.count), 1)

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Stats</Text>

        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>{sessionsToday}</Text>
            <Text style={styles.kpiLabel}>today</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>{sessionsThisWeek}</Text>
            <Text style={styles.kpiLabel}>this week</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>{streak}</Text>
            <Text style={styles.kpiLabel}>day streak</Text>
          </Card>
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Last 7 days</Text>
          <View style={styles.chart}>
            {weekData.map(({ date, count, label, isToday }) => (
              <View key={date} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  {count > 0 && (
                    <View
                      style={[
                        styles.bar,
                        { height: (count / maxCount) * BAR_MAX_HEIGHT },
                        isToday ? styles.barToday : styles.barPast
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[styles.barLabel, isToday && styles.barLabelToday]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 36
  },
  heading: {
    color: '#1F2A24',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.8
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10
  },
  kpiCard: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 8,
    gap: 4
  },
  kpiNumber: {
    color: '#1F2A24',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 38
  },
  kpiLabel: {
    color: '#9AA49E',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center'
  },
  chartSection: {
    gap: 14
  },
  sectionTitle: {
    color: '#9AA49E',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    backgroundColor: '#EDE8DF',
    borderRadius: 20,
    padding: 20,
    paddingBottom: 16
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8
  },
  barTrack: {
    width: '100%',
    height: BAR_MAX_HEIGHT,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 6
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4
  },
  barToday: {
    backgroundColor: '#2E5E4E'
  },
  barPast: {
    backgroundColor: '#B8B2A8'
  },
  barLabel: {
    color: '#9AA49E',
    fontSize: 11,
    fontWeight: '500'
  },
  barLabelToday: {
    color: '#2E5E4E',
    fontWeight: '600'
  }
})
