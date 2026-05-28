import { Card } from '@/components/card'
import { Screen } from '@/components/screen'
import { useAppTheme } from '@/hooks/use-app-theme'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

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

const MAX_WEEK_OFFSET = 8

function buildWeekDataForOffset(log: string[], weekOffset: number): WeekDay[] {
  const base = weekOffset * 7
  return Array.from({ length: 7 }, (_, i) => {
    const daysAgo = base + (6 - i)
    const date = offsetISO(daysAgo)
    return {
      date,
      count: log.filter((d) => d === date).length,
      label: dayLabel(daysAgo),
      isToday: daysAgo === 0
    }
  })
}

function weekRangeLabel(weekOffset: number): string {
  if (weekOffset === 0) return 'This week'
  if (weekOffset === 1) return 'Last week'
  const end = new Date()
  end.setDate(end.getDate() - weekOffset * 7)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ]
  const sm = months[start.getMonth()]
  const em = months[end.getMonth()]
  return sm === em
    ? `${sm} ${start.getDate()}–${end.getDate()}`
    : `${sm} ${start.getDate()} – ${em} ${end.getDate()}`
}

export default function StatsScreen() {
  const c = useAppTheme()
  const styles = makeStyles(c)
  const [sessionsToday, setSessionsToday] = useState(0)
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0)
  const [streak, setStreak] = useState(0)
  const [weekData, setWeekData] = useState<WeekDay[]>(() =>
    buildWeekDataForOffset([], 0)
  )
  const [weekOffset, setWeekOffset] = useState(0)
  const [fullLog, setFullLog] = useState<string[]>([])

  useFocusEffect(
    useCallback(() => {
      setWeekOffset(0)
      AsyncStorage.getItem('anchor:sessionsLog')
        .then((raw) => {
          const log: string[] = raw ? JSON.parse(raw) : []
          const today = todayISO()
          const week = buildWeekDataForOffset(log, 0)
          setFullLog(log)
          setSessionsToday(log.filter((d) => d === today).length)
          setSessionsThisWeek(week.reduce((sum, d) => sum + d.count, 0))
          setStreak(computeStreak(log))
          setWeekData(week)
        })
        .catch(() => {})
    }, [])
  )

  useEffect(() => {
    if (fullLog.length === 0 && weekOffset === 0) return
    const week = buildWeekDataForOffset(fullLog, weekOffset)
    setSessionsThisWeek(week.reduce((sum, d) => sum + d.count, 0))
    setWeekData(week)
  }, [weekOffset, fullLog])

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
            <Text style={styles.kpiLabel}>
              {weekOffset === 0
                ? 'this week'
                : weekOffset === 1
                  ? 'last week'
                  : 'that week'}
            </Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>{streak}</Text>
            <Text style={styles.kpiLabel}>day streak</Text>
          </Card>
        </View>

        <View style={styles.chartSection}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity
              onPress={() =>
                setWeekOffset((o) => Math.min(o + 1, MAX_WEEK_OFFSET))
              }
              disabled={weekOffset >= MAX_WEEK_OFFSET}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text
                style={[
                  styles.navArrow,
                  weekOffset >= MAX_WEEK_OFFSET && styles.navArrowDisabled
                ]}
              >
                ‹
              </Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>
              {weekRangeLabel(weekOffset)}
            </Text>
            <TouchableOpacity
              onPress={() => setWeekOffset((o) => Math.max(o - 1, 0))}
              disabled={weekOffset === 0}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text
                style={[
                  styles.navArrow,
                  weekOffset === 0 && styles.navArrowDisabled
                ]}
              >
                ›
              </Text>
            </TouchableOpacity>
          </View>
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

function makeStyles(c: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 24,
      paddingTop: 48,
      paddingBottom: 40,
      gap: 36
    },
    heading: {
      color: c.textDark,
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
      color: c.textDark,
      fontSize: 32,
      fontWeight: '700',
      letterSpacing: -0.5,
      lineHeight: 38
    },
    kpiLabel: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '500',
      textAlign: 'center'
    },
    chartSection: {
      gap: 14
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    navArrow: {
      color: c.textMuted,
      fontSize: 20,
      fontWeight: '400',
      lineHeight: 22
    },
    navArrowDisabled: {
      color: c.textFaint,
      opacity: 0.35
    },
    sectionTitle: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.5,
      textTransform: 'uppercase'
    },
    chart: {
      backgroundColor: c.bgList,
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
      color: c.textFaint,
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
      backgroundColor: c.border
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
      color: c.textBody,
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
      backgroundColor: c.primary
    },
    barPast: {
      backgroundColor: c.dot
    },
    dayLabelsRow: {
      flexDirection: 'row'
    },
    yAxisSpacer: {
      width: 26
    },
    dayLabel: {
      flex: 1,
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '500',
      textAlign: 'center'
    },
    dayLabelToday: {
      color: c.primary,
      fontWeight: '600'
    }
  })
}
