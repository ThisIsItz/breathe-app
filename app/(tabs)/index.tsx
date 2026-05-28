import { PrimaryButton } from '@/components/primary-button'
import { Screen } from '@/components/screen'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import * as Notifications from 'expo-notifications'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'

const TICK_MS = 1000

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
})

export default function HomeScreen() {
  const router = useRouter()
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isSessionComplete, setIsSessionComplete] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [totalCycles, setTotalCycles] = useState<3 | 5>(3)
  const [inhaleDuration, setInhaleDuration] = useState<3 | 4 | 5>(4)
  const [exhaleDuration, setExhaleDuration] = useState<4 | 6 | 8>(6)
  const [hapticsEnabled, setHapticsEnabled] = useState(true)
  const [cycleCount, setCycleCount] = useState(1)
  const [phaseCount, setPhaseCount] = useState(1)
  const [phase, setPhase] = useState<'Inhale' | 'Exhale'>('Inhale')

  const circleAnim = useRef(new Animated.Value(0)).current
  const isLoaded = useRef(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [breaths, sessions, inhale, exhale, haptics] = await Promise.all([
          AsyncStorage.getItem('anchor:totalCycles'),
          AsyncStorage.getItem('anchor:completedSessions'),
          AsyncStorage.getItem('anchor:inhaleDuration'),
          AsyncStorage.getItem('anchor:exhaleDuration'),
          AsyncStorage.getItem('anchor:haptics')
        ])
        if (breaths === '3' || breaths === '5')
          setTotalCycles(breaths === '5' ? 5 : 3)
        if (sessions !== null) setCompletedSessions(parseInt(sessions, 10))
        const pi = inhale ? parseInt(inhale, 10) : null
        if (pi === 3 || pi === 4 || pi === 5) setInhaleDuration(pi)
        const pe = exhale ? parseInt(exhale, 10) : null
        if (pe === 4 || pe === 6 || pe === 8) setExhaleDuration(pe)
        if (haptics === 'false') setHapticsEnabled(false)
      } catch {}
      isLoaded.current = true
    }
    load()
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (!isLoaded.current) return
      Promise.all([
        AsyncStorage.getItem('anchor:totalCycles'),
        AsyncStorage.getItem('anchor:inhaleDuration'),
        AsyncStorage.getItem('anchor:exhaleDuration'),
        AsyncStorage.getItem('anchor:haptics')
      ])
        .then(([breaths, inhale, exhale, haptics]) => {
          if (breaths === '3' || breaths === '5')
            setTotalCycles(breaths === '5' ? 5 : 3)
          const pi = inhale ? parseInt(inhale, 10) : null
          if (pi === 3 || pi === 4 || pi === 5) setInhaleDuration(pi)
          const pe = exhale ? parseInt(exhale, 10) : null
          if (pe === 4 || pe === 6 || pe === 8) setExhaleDuration(pe)
          if (haptics !== null) setHapticsEnabled(haptics !== 'false')
        })
        .catch(() => {})
    }, [])
  )

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem(
      'anchor:completedSessions',
      String(completedSessions)
    ).catch(() => {})
  }, [completedSessions])

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
    if (hapticsEnabled)
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
        if (hapticsEnabled)
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        setPhase('Exhale')
        setPhaseCount(1)
        return
      }

      if (cycleCount < totalCycles) {
        if (hapticsEnabled)
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
      duration:
        TICK_MS * (phase === 'Inhale' ? inhaleDuration : exhaleDuration),
      useNativeDriver: true
    }).start()
  }, [phase, isSessionActive])

  const circleScale = circleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.7]
  })

  return (
    <Screen>
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

          <PrimaryButton
            label="Cancel"
            onPress={cancelSession}
            variant="secondary"
          />
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
            <PrimaryButton label="Do another session" onPress={startSession} />
            <PrimaryButton
              label="Back home"
              onPress={() => setIsSessionComplete(false)}
              variant="secondary"
            />
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

          <Pressable
            style={styles.settingsCard}
            onPress={() => router.navigate('/settings')}
          >
            <Text style={styles.settingsCardLine}>{totalCycles} breaths</Text>
            <Text style={styles.settingsCardLine}>
              {inhaleDuration}s in · {exhaleDuration}s out
            </Text>
            <Text style={styles.settingsCardHint}>Tap to customize</Text>
          </Pressable>

          <PrimaryButton label="Start breathing" onPress={startSession} />

          {completedSessions > 0 && (
            <Text style={styles.sessionBadge}>
              {completedSessions}{' '}
              {completedSessions === 1 ? 'session' : 'sessions'} today
            </Text>
          )}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
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
  settingsCard: {
    backgroundColor: '#E5E0D7',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 2,
    alignSelf: 'flex-start'
  },
  settingsCardLine: {
    color: '#55635C',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20
  },
  settingsCardHint: {
    color: '#9AA49E',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6
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
  }
})
