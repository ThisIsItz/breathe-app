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
  const rawMax = Math.max(maxCount, 2)
  const maxDisplay = rawMax % 2 === 0 ? rawMax : rawMax + 1
  const midDisplay = maxDisplay / 2
  const scale = BAR_MAX_HEIGHT / maxDisplay

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
            <View style={styles.chartBody}>
              <View style={styles.yAxis}>
                <Text style={styles.yLabel}>{maxDisplay}</Text>
                <Text style={styles.yLabel}>{midDisplay}</Text>
                <Text style={styles.yLabel}>0</Text>
              </View>
              <View style={styles.chartPlot}>
                <View style={[styles.gridLine, { top: 0 }]} />
                <View style={[styles.gridLine, { top: BAR_MAX_HEIGHT / 2 }]} />
                <View style={[styles.gridLine, { bottom: 0 }]} />
                <View style={styles.barsRow}>
                  {weekData.map(({ date, count, isToday }) => (
                    <View key={date} style={styles.barColumn}>
                      {count > 0 && (
                        <>
                          <Text
                            style={[
                              styles.barValue,
                              { bottom: count * scale + 4 }
                            ]}
                          >
                            {count}
                          </Text>
                          <View
                            style={[
                              styles.bar,
                              { height: count * scale },
                              isToday ? styles.barToday : styles.barPast
                            ]}
                          />
                        </>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.dayLabelsRow}>
              <View style={styles.yAxisSpacer} />
              {weekData.map(({ date, label, isToday }) => (
                <Text
                  key={date}
                  style={[styles.dayLabel, isToday && styles.dayLabelToday]}
                >
                  {label}
                </Text>
              ))}
            </View>
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
    backgroundColor: '#EDE8DF',
    borderRadius: 20,
    padding: 20,
    paddingBottom: 16,
    gap: 10
  },
  chartBody: {
    flexDirection: 'row',
    gap: 8
  },
  yAxis: {
    width: 18,
    height: BAR_MAX_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  yLabel: {
    color: '#B8B2A8',
    fontSize: 9,
    fontWeight: '500',
    lineHeight: 11
  },
  chartPlot: {
    flex: 1,
    height: BAR_MAX_HEIGHT
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#D5CFC6'
  },
  barsRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row'
  },
  barColumn: {
    flex: 1,
    alignItems: 'center'
  },
  barValue: {
    position: 'absolute',
    color: '#55635C',
    fontSize: 9,
    fontWeight: '600',
    width: '100%',
    textAlign: 'center'
  },
  bar: {
    position: 'absolute',
    bottom: 0,
    width: '60%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3
  },
  barToday: {
    backgroundColor: '#2E5E4E'
  },
  barPast: {
    backgroundColor: '#B8B2A8'
  },
  dayLabelsRow: {
    flexDirection: 'row'
  },
  yAxisSpacer: {
    width: 26
  },
  dayLabel: {
    flex: 1,
    color: '#9AA49E',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center'
  },
  dayLabelToday: {
    color: '#2E5E4E',
    fontWeight: '600'
  }
})
