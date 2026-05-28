import { Screen } from '@/components/screen'
import { SettingRow } from '@/components/setting-row'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { useEffect, useRef, useState } from 'react'
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'

const BREATH_OPTIONS = [3, 5] as const
const INHALE_OPTIONS = [3, 4, 5] as const
const EXHALE_OPTIONS = [4, 6, 8] as const

type ReminderMode = 'off' | '1h' | '2h' | '4h' | 'daily'

const REMINDER_OPTIONS: Array<{ value: ReminderMode; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: '1h', label: 'Every hour' },
  { value: '2h', label: 'Every 2 hours' },
  { value: '4h', label: 'Every 4 hours' },
  { value: 'daily', label: 'Daily' }
]

const DAILY_HOUR_OPTIONS = [8, 9, 12, 18, 20]
const CHANNEL_ID = 'anchor-reminders'

const formatHour = (h: number) =>
  h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`

async function applyReminder(mode: ReminderMode, hour: number): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
  if (mode === 'off') return

  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Breathing reminders',
      importance: Notifications.AndroidImportance.DEFAULT
    })
  }

  const content: Notifications.NotificationContentInput = {
    title: 'Time to breathe',
    body: 'Take a moment for yourself.'
  }

  if (mode === 'daily') {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
        channelId: CHANNEL_ID
      }
    })
  } else {
    const seconds = mode === '1h' ? 3600 : mode === '2h' ? 7200 : 14400
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: true,
        channelId: CHANNEL_ID
      }
    })
  }
}

export default function SettingsScreen() {
  const [totalCycles, setTotalCycles] = useState<3 | 5>(3)
  const [inhaleDuration, setInhaleDuration] = useState<3 | 4 | 5>(4)
  const [exhaleDuration, setExhaleDuration] = useState<4 | 6 | 8>(6)
  const [hapticsEnabled, setHapticsEnabled] = useState(true)
  const [reminderMode, setReminderMode] = useState<ReminderMode>('off')
  const [dailyHour, setDailyHour] = useState(9)

  const isLoaded = useRef(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [breaths, inhale, exhale, haptics, reminder, savedHour] =
          await Promise.all([
            AsyncStorage.getItem('anchor:totalCycles'),
            AsyncStorage.getItem('anchor:inhaleDuration'),
            AsyncStorage.getItem('anchor:exhaleDuration'),
            AsyncStorage.getItem('anchor:haptics'),
            AsyncStorage.getItem('anchor:reminderMode'),
            AsyncStorage.getItem('anchor:dailyHour')
          ])
        if (breaths === '3' || breaths === '5')
          setTotalCycles(breaths === '5' ? 5 : 3)
        const pi = inhale ? parseInt(inhale, 10) : null
        if (pi === 3 || pi === 4 || pi === 5) setInhaleDuration(pi)
        const pe = exhale ? parseInt(exhale, 10) : null
        if (pe === 4 || pe === 6 || pe === 8) setExhaleDuration(pe)
        if (haptics === 'false') setHapticsEnabled(false)
        const validModes: ReminderMode[] = ['off', '1h', '2h', '4h', 'daily']
        if (reminder && validModes.includes(reminder as ReminderMode))
          setReminderMode(reminder as ReminderMode)
        const ph = savedHour ? parseInt(savedHour, 10) : null
        if (ph !== null && DAILY_HOUR_OPTIONS.includes(ph)) setDailyHour(ph)
      } catch {}
      isLoaded.current = true
    }
    load()
  }, [])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:totalCycles', String(totalCycles)).catch(
      () => {}
    )
  }, [totalCycles])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:inhaleDuration', String(inhaleDuration)).catch(
      () => {}
    )
  }, [inhaleDuration])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:exhaleDuration', String(exhaleDuration)).catch(
      () => {}
    )
  }, [exhaleDuration])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:haptics', String(hapticsEnabled)).catch(
      () => {}
    )
  }, [hapticsEnabled])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:reminderMode', reminderMode).catch(() => {})
  }, [reminderMode])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:dailyHour', String(dailyHour)).catch(() => {})
  }, [dailyHour])

  const handleReminderChange = (mode: ReminderMode) => {
    setReminderMode(mode)
    applyReminder(mode, dailyHour).catch(() => {})
  }

  const handleDailyHourChange = (hour: number) => {
    setDailyHour(hour)
    if (reminderMode === 'daily') {
      applyReminder('daily', hour).catch(() => {})
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Breathing</Text>
          <View style={styles.group}>
            <SettingRow label="Breaths per session">
              <View style={styles.row}>
                {BREATH_OPTIONS.map((n) => (
                  <Pressable
                    key={n}
                    style={[
                      styles.pill,
                      totalCycles === n && styles.pillActive
                    ]}
                    onPress={() => setTotalCycles(n)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        totalCycles === n && styles.pillTextActive
                      ]}
                    >
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </SettingRow>

            <SettingRow label="Inhale">
              <View style={styles.row}>
                {INHALE_OPTIONS.map((n) => (
                  <Pressable
                    key={n}
                    style={[
                      styles.pill,
                      inhaleDuration === n && styles.pillActive
                    ]}
                    onPress={() => setInhaleDuration(n)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        inhaleDuration === n && styles.pillTextActive
                      ]}
                    >
                      {n}s
                    </Text>
                  </Pressable>
                ))}
              </View>
            </SettingRow>

            <SettingRow label="Exhale">
              <View style={styles.row}>
                {EXHALE_OPTIONS.map((n) => (
                  <Pressable
                    key={n}
                    style={[
                      styles.pill,
                      exhaleDuration === n && styles.pillActive
                    ]}
                    onPress={() => setExhaleDuration(n)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        exhaleDuration === n && styles.pillTextActive
                      ]}
                    >
                      {n}s
                    </Text>
                  </Pressable>
                ))}
              </View>
            </SettingRow>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          <View style={styles.group}>
            <SettingRow label="Haptics">
              <View style={styles.row}>
                {([true, false] as const).map((value) => (
                  <Pressable
                    key={String(value)}
                    style={[
                      styles.tagPill,
                      hapticsEnabled === value && styles.pillActive
                    ]}
                    onPress={() => setHapticsEnabled(value)}
                  >
                    <Text
                      style={[
                        styles.tagPillText,
                        hapticsEnabled === value && styles.pillTextActive
                      ]}
                    >
                      {value ? 'On' : 'Off'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </SettingRow>

            <SettingRow label="Reminder">
              <View style={styles.optionList}>
                {REMINDER_OPTIONS.map(({ value, label }, i) => {
                  const active = reminderMode === value
                  return (
                    <Pressable
                      key={value}
                      style={[
                        styles.optionRow,
                        i < REMINDER_OPTIONS.length - 1 &&
                          styles.optionRowBorder
                      ]}
                      onPress={() => handleReminderChange(value)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          active && styles.optionTextActive
                        ]}
                      >
                        {label}
                      </Text>
                      <View
                        style={[
                          styles.optionDot,
                          active && styles.optionDotActive
                        ]}
                      />
                    </Pressable>
                  )
                })}
              </View>
              {reminderMode === 'daily' && (
                <View style={styles.dailyRow}>
                  {DAILY_HOUR_OPTIONS.map((h) => (
                    <Pressable
                      key={h}
                      style={[
                        styles.tagPill,
                        dailyHour === h && styles.pillActive
                      ]}
                      onPress={() => handleDailyHourChange(h)}
                    >
                      <Text
                        style={[
                          styles.tagPillText,
                          dailyHour === h && styles.pillTextActive
                        ]}
                      >
                        {formatHour(h)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </SettingRow>
          </View>
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
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
  section: {
    gap: 16
  },
  sectionTitle: {
    color: '#1F2A24',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4
  },
  group: {
    gap: 24
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  pill: {
    width: 72,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#E5E0D7',
    alignItems: 'center'
  },
  pillActive: {
    backgroundColor: '#2E5E4E'
  },
  pillText: {
    color: '#3A4942',
    fontSize: 20,
    fontWeight: '600'
  },
  pillTextActive: {
    color: '#F8F6F2'
  },
  tagPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#E5E0D7',
    alignItems: 'center',
    minWidth: 56
  },
  tagPillText: {
    color: '#3A4942',
    fontSize: 14,
    fontWeight: '600'
  },
  optionList: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#EDE8DF'
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16
  },
  optionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D5CFC6'
  },
  optionText: {
    color: '#55635C',
    fontSize: 15,
    fontWeight: '500'
  },
  optionTextActive: {
    color: '#2E5E4E',
    fontWeight: '600'
  },
  optionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#C8C2B8'
  },
  optionDotActive: {
    backgroundColor: '#2E5E4E',
    borderColor: '#2E5E4E'
  },
  dailyRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    paddingTop: 4
  }
})
