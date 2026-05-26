import AsyncStorage from '@react-native-async-storage/async-storage'
import { StatusBar } from 'expo-status-bar'
import * as Haptics from 'expo-haptics'
import { useEffect, useRef, useState } from 'react'
import * as Notifications from 'expo-notifications'
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const TICK_MS = 1000

const BREATH_OPTIONS = [3, 5] as const
const INHALE_OPTIONS = [3, 4, 5] as const
const EXHALE_OPTIONS = [4, 6, 8] as const

const STORAGE_KEY_BREATHS = 'anchor:totalCycles'
const STORAGE_KEY_SESSIONS = 'anchor:completedSessions'
const STORAGE_KEY_INHALE = 'anchor:inhaleDuration'
const STORAGE_KEY_EXHALE = 'anchor:exhaleDuration'
const STORAGE_KEY_REMINDER = 'anchor:reminderMode'
const STORAGE_KEY_DAILY_HOUR = 'anchor:dailyHour'

type ReminderMode = 'off' | '1h' | '2h' | '4h' | 'daily'

const REMINDER_OPTIONS: Array<{ value: ReminderMode; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: '1h', label: '1h' },
  { value: '2h', label: '2h' },
  { value: '4h', label: '4h' },
  { value: 'daily', label: 'Daily' },
]

const DAILY_HOUR_OPTIONS = [8, 9, 12, 18, 20]
const CHANNEL_ID = 'anchor-reminders'

const formatHour = (h: number) =>
  h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

async function applyReminder(mode: ReminderMode, hour: number): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
  if (mode === 'off') return

  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Breathing reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  const content: Notifications.NotificationContentInput = {
    title: 'Time to breathe',
    body: 'Take a moment for yourself.',
  }

  if (mode === 'daily') {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
        channelId: CHANNEL_ID,
      },
    })
  } else {
    const seconds = mode === '1h' ? 3600 : mode === '2h' ? 7200 : 14400
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: true,
        channelId: CHANNEL_ID,
      },
    })
  }
}

export default function HomeScreen() {
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isSessionComplete, setIsSessionComplete] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [totalCycles, setTotalCycles] = useState<3 | 5>(3)
  const [inhaleDuration, setInhaleDuration] = useState<3 | 4 | 5>(4)
  const [exhaleDuration, setExhaleDuration] = useState<4 | 6 | 8>(6)
  const [cycleCount, setCycleCount] = useState(1)
  const [phaseCount, setPhaseCount] = useState(1)
  const [phase, setPhase] = useState<'Inhale' | 'Exhale'>('Inhale')
  const [reminderMode, setReminderMode] = useState<ReminderMode>('off')
  const [dailyHour, setDailyHour] = useState(9)

  const circleAnim = useRef(new Animated.Value(0)).current
  const isLoaded = useRef(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [breaths, sessions, inhale, exhale, reminder, savedHour] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_BREATHS),
          AsyncStorage.getItem(STORAGE_KEY_SESSIONS),
          AsyncStorage.getItem(STORAGE_KEY_INHALE),
          AsyncStorage.getItem(STORAGE_KEY_EXHALE),
          AsyncStorage.getItem(STORAGE_KEY_REMINDER),
          AsyncStorage.getItem(STORAGE_KEY_DAILY_HOUR),
        ])
        if (breaths === '3' || breaths === '5')
          setTotalCycles(breaths === '5' ? 5 : 3)
        if (sessions !== null) setCompletedSessions(parseInt(sessions, 10))
        const pi = inhale ? parseInt(inhale, 10) : null
        if (pi === 3 || pi === 4 || pi === 5) setInhaleDuration(pi)
        const pe = exhale ? parseInt(exhale, 10) : null
        if (pe === 4 || pe === 6 || pe === 8) setExhaleDuration(pe)
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
    AsyncStorage.setItem(STORAGE_KEY_BREATHS, String(totalCycles)).catch(() => {})
  }, [totalCycles])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem(STORAGE_KEY_SESSIONS, String(completedSessions)).catch(() => {})
  }, [completedSessions])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem(STORAGE_KEY_INHALE, String(inhaleDuration)).catch(() => {})
  }, [inhaleDuration])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem(STORAGE_KEY_EXHALE, String(exhaleDuration)).catch(() => {})
  }, [exhaleDuration])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem(STORAGE_KEY_REMINDER, reminderMode).catch(() => {})
  }, [reminderMode])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem(STORAGE_KEY_DAILY_HOUR, String(dailyHour)).catch(() => {})
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

  const resetSession = () => {
    circleAnim.stopAnimation()
    circleAnim.setValue(0)
    setCycleCount(1)
    setPhaseCount(1)
    setPhase('Inhale')
  }

  const startSession = () => {
    resetSession()
    setIsSessionComplete(false)
    setIsSessionActive(true)
  }

  const cancelSession = () => {
    resetSession()
    setIsSessionActive(false)
  }

  const completeSession = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    resetSession()
    setIsSessionActive(false)
    setCompletedSessions((prev) => prev + 1)
    setIsSessionComplete(true)
  }

  useEffect(() => {
    if (!isSessionActive) {
      return
    }

    const timer = setTimeout(() => {
      const phaseTicks = phase === 'Inhale' ? inhaleDuration : exhaleDuration

      if (phaseCount < phaseTicks) {
        setPhaseCount((prev) => prev + 1)
        return
      }

      if (phase === 'Inhale') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        setPhase('Exhale')
        setPhaseCount(1)
        return
      }

      if (cycleCount < totalCycles) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        setCycleCount((prev) => prev + 1)
        setPhase('Inhale')
        setPhaseCount(1)
        return
      }

      completeSession()
    }, TICK_MS)

    return () => clearTimeout(timer)
  }, [cycleCount, isSessionActive, phase, phaseCount, totalCycles])

  useEffect(() => {
    if (!isSessionActive) return

    Animated.timing(circleAnim, {
      toValue: phase === 'Inhale' ? 1 : 0,
      duration: TICK_MS * (phase === 'Inhale' ? inhaleDuration : exhaleDuration),
      useNativeDriver: true
    }).start()
  }, [phase, isSessionActive])

  const circleScale = circleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.7]
  })

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {isSessionActive ? (
        <View style={styles.sessionContainer}>
          <Text style={styles.sessionTitle}>Anchor</Text>

          <View style={styles.circleArea}>
            <Animated.View
              style={[styles.circle, { transform: [{ scale: circleScale }] }]}
            />
          </View>

          <View style={styles.sessionInfo}>
            <Text style={styles.phaseText}>{phase}</Text>
            <Text style={styles.countText}>{phaseCount}</Text>
          </View>

          <View style={styles.progressDots}>
            {Array.from({ length: totalCycles }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i + 1 <= cycleCount ? styles.dotActive : styles.dotInactive
                ]}
              />
            ))}
          </View>

          <Pressable style={styles.cancelButton} onPress={cancelSession}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      ) : isSessionComplete ? (
        <View style={styles.homeContainer}>
          <Text style={styles.title}>Anchor</Text>

          <View style={styles.section}>
            <Text style={styles.completionHeading}>Well done.</Text>
            <Text style={styles.subtitle}>
              You took a moment{`\n`}for yourself.
            </Text>
          </View>

          <Text style={styles.sessionBadge}>
            {completedSessions}{' '}
            {completedSessions === 1 ? 'session' : 'sessions'} today
          </Text>

          <View style={styles.actions}>
            <Pressable style={styles.button} onPress={startSession}>
              <Text style={styles.buttonText}>Do another session</Text>
            </Pressable>
            <Pressable
              style={styles.cancelButton}
              onPress={() => setIsSessionComplete(false)}
            >
              <Text style={styles.cancelButtonText}>Back home</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.homeContainer}>
          <View>
            <Text style={styles.title}>Anchor</Text>
            <Text style={styles.subtitle}>
              A tiny pause to come back{`\n`}to yourself
            </Text>
          </View>

          <View style={styles.settingsGroup}>
            <View style={styles.settingsSection}>
              <Text style={styles.settingsLabel}>Breaths per session</Text>
              <View style={styles.selectorRow}>
                {BREATH_OPTIONS.map((n) => (
                  <Pressable
                    key={n}
                    style={[
                      styles.selectorPill,
                      totalCycles === n && styles.selectorPillActive
                    ]}
                    onPress={() => setTotalCycles(n)}
                  >
                    <Text
                      style={[
                        styles.selectorPillText,
                        totalCycles === n && styles.selectorPillTextActive
                      ]}
                    >
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsLabel}>Inhale</Text>
              <View style={styles.selectorRow}>
                {INHALE_OPTIONS.map((n) => (
                  <Pressable
                    key={n}
                    style={[
                      styles.selectorPill,
                      inhaleDuration === n && styles.selectorPillActive
                    ]}
                    onPress={() => setInhaleDuration(n)}
                  >
                    <Text
                      style={[
                        styles.selectorPillText,
                        inhaleDuration === n && styles.selectorPillTextActive
                      ]}
                    >
                      {n}s
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsLabel}>Exhale</Text>
              <View style={styles.selectorRow}>
                {EXHALE_OPTIONS.map((n) => (
                  <Pressable
                    key={n}
                    style={[
                      styles.selectorPill,
                      exhaleDuration === n && styles.selectorPillActive
                    ]}
                    onPress={() => setExhaleDuration(n)}
                  >
                    <Text
                      style={[
                        styles.selectorPillText,
                        exhaleDuration === n && styles.selectorPillTextActive
                      ]}
                    >
                      {n}s
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsLabel}>Reminder</Text>
              <View style={styles.selectorRow}>
                {REMINDER_OPTIONS.map(({ value, label }) => (
                  <Pressable
                    key={value}
                    style={[
                      styles.reminderPill,
                      reminderMode === value && styles.reminderPillActive
                    ]}
                    onPress={() => handleReminderChange(value)}
                  >
                    <Text
                      style={[
                        styles.reminderPillText,
                        reminderMode === value && styles.reminderPillTextActive
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {reminderMode === 'daily' && (
                <View style={styles.selectorRow}>
                  {DAILY_HOUR_OPTIONS.map((h) => (
                    <Pressable
                      key={h}
                      style={[
                        styles.reminderPill,
                        dailyHour === h && styles.reminderPillActive
                      ]}
                      onPress={() => handleDailyHourChange(h)}
                    >
                      <Text
                        style={[
                          styles.reminderPillText,
                          dailyHour === h && styles.reminderPillTextActive
                        ]}
                      >
                        {formatHour(h)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          <Pressable style={styles.button} onPress={startSession}>
            <Text style={styles.buttonText}>Start breathing</Text>
          </Pressable>

          {completedSessions > 0 && (
            <Text style={styles.sessionBadge}>
              {completedSessions}{' '}
              {completedSessions === 1 ? 'session' : 'sessions'} today
            </Text>
          )}
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F1EA'
  },

  // Home + completion shared layout
  homeContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 36,
    justifyContent: 'center'
  },
  title: {
    color: '#1F2A24',
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 50,
    marginBottom: 8
  },
  subtitle: {
    color: '#55635C',
    fontSize: 17,
    lineHeight: 26
  },
  section: {
    gap: 8
  },
  completionHeading: {
    color: '#1F2A24',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 42
  },
  settingsSection: {
    gap: 12
  },
  settingsGroup: {
    gap: 24
  },
  settingsLabel: {
    color: '#9AA49E',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8
  },
  selectorPill: {
    width: 72,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#E5E0D7',
    alignItems: 'center'
  },
  selectorPillActive: {
    backgroundColor: '#2E5E4E'
  },
  selectorPillText: {
    color: '#3A4942',
    fontSize: 20,
    fontWeight: '600'
  },
  selectorPillTextActive: {
    color: '#F8F6F2'
  },
  sessionBadge: {
    color: '#9AA49E',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3
  },
  actions: {
    gap: 12
  },
  button: {
    backgroundColor: '#2E5E4E',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center'
  },
  buttonText: {
    color: '#F8F6F2',
    fontSize: 17,
    fontWeight: '600'
  },
  cancelButton: {
    backgroundColor: '#E5E0D7',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#3A4942',
    fontSize: 17,
    fontWeight: '600'
  },

  // Session layout
  sessionContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 40,
    paddingTop: 16,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sessionTitle: {
    alignSelf: 'flex-start',
    color: '#1F2A24',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  circleArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#2E5E4E',
    opacity: 0.18
  },
  sessionInfo: {
    alignItems: 'center',
    gap: 2,
    marginBottom: 28
  },
  phaseText: {
    color: '#55635C',
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase'
  },
  countText: {
    color: '#1F2A24',
    fontSize: 64,
    fontWeight: '700',
    lineHeight: 72
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  dotActive: {
    backgroundColor: '#2E5E4E'
  },
  dotInactive: {
    backgroundColor: '#C8C2B8'
  },
  reminderPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#E5E0D7',
    alignItems: 'center'
  },
  reminderPillActive: {
    backgroundColor: '#2E5E4E'
  },
  reminderPillText: {
    color: '#3A4942',
    fontSize: 14,
    fontWeight: '600'
  },
  reminderPillTextActive: {
    color: '#F8F6F2'
  }
})
