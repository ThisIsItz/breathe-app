import { PrimaryButton } from '@/components/primary-button'
import { Screen } from '@/components/screen'
import { useAppTheme } from '@/hooks/use-app-theme'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import * as Notifications from 'expo-notifications'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'

const TICK_MS = 1000

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
})

export default function HomeScreen() {
  const c = useAppTheme()
  const styles = makeStyles(c)
  const router = useRouter()
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isSessionComplete, setIsSessionComplete] = useState(false)
  const [sessionsToday, setSessionsToday] = useState(0)
  const [totalCycles, setTotalCycles] = useState<number>(3)
  const [inhaleDuration, setInhaleDuration] = useState<number>(4)
  const [holdDuration, setHoldDuration] = useState<number>(0)
  const [exhaleDuration, setExhaleDuration] = useState<number>(6)
  const [hapticsEnabled, setHapticsEnabled] = useState(true)
  const [cycleCount, setCycleCount] = useState(1)
  const [phaseCount, setPhaseCount] = useState(1)
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale')

  const circleAnim = useRef(new Animated.Value(0)).current
  const [isFinishing, setIsFinishing] = useState(false)
  const finishFade = useRef(new Animated.Value(1)).current
  const completionFade = useRef(new Animated.Value(0)).current
  const isLoaded = useRef(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [breaths, log, inhale, hold, exhale, haptics] = await Promise.all(
          [
            AsyncStorage.getItem('anchor:totalCycles'),
            AsyncStorage.getItem('anchor:sessionsLog'),
            AsyncStorage.getItem('anchor:inhaleDuration'),
            AsyncStorage.getItem('anchor:holdDuration'),
            AsyncStorage.getItem('anchor:exhaleDuration'),
            AsyncStorage.getItem('anchor:haptics')
          ]
        )
        const pb = breaths ? parseInt(breaths, 10) : null
        if (pb !== null && pb >= 1 && pb <= 20) setTotalCycles(pb)
        const parsed: string[] = log ? JSON.parse(log) : []
        const today = todayISO()
        setSessionsToday(parsed.filter((d) => d === today).length)
        const pi = inhale ? parseInt(inhale, 10) : null
        if (pi !== null && pi >= 1 && pi <= 10) setInhaleDuration(pi)
        const ph = hold ? parseInt(hold, 10) : null
        if (ph !== null && ph >= 0 && ph <= 3) setHoldDuration(ph)
        const pe = exhale ? parseInt(exhale, 10) : null
        if (pe !== null && pe >= 1 && pe <= 15) setExhaleDuration(pe)
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
        AsyncStorage.getItem('anchor:holdDuration'),
        AsyncStorage.getItem('anchor:exhaleDuration'),
        AsyncStorage.getItem('anchor:haptics')
      ])
        .then(([breaths, inhale, hold, exhale, haptics]) => {
          const pb = breaths ? parseInt(breaths, 10) : null
          if (pb !== null && pb >= 1 && pb <= 20) setTotalCycles(pb)
          const pi = inhale ? parseInt(inhale, 10) : null
          if (pi !== null && pi >= 1 && pi <= 10) setInhaleDuration(pi)
          const ph = hold ? parseInt(hold, 10) : null
          if (ph !== null && ph >= 0 && ph <= 3) setHoldDuration(ph)
          const pe = exhale ? parseInt(exhale, 10) : null
          if (pe !== null && pe >= 1 && pe <= 15) setExhaleDuration(pe)
          if (haptics !== null) setHapticsEnabled(haptics !== 'false')
        })
        .catch(() => {})
    }, [])
  )

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
    finishFade.setValue(1)
    completionFade.setValue(0)
    setIsSessionActive(true)
  }

  const cancelSession = () => {
    resetSession()
    setIsSessionActive(false)
  }

  const completeSession = async () => {
    if (hapticsEnabled)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    resetSession()
    setIsSessionActive(false)
    setIsFinishing(true)
    finishFade.setValue(1)
    completionFade.setValue(0)
    try {
      const today = todayISO()
      const raw = await AsyncStorage.getItem('anchor:sessionsLog')
      const log: string[] = raw ? JSON.parse(raw) : []
      log.push(today)
      await AsyncStorage.setItem('anchor:sessionsLog', JSON.stringify(log))
      setSessionsToday(log.filter((d) => d === today).length)
    } catch {}
    Animated.sequence([
      Animated.delay(900),
      Animated.timing(finishFade, {
        toValue: 0,
        duration: 1400,
        useNativeDriver: true
      })
    ]).start(() => {
      setIsFinishing(false)
      setIsSessionComplete(true)
      Animated.timing(completionFade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true
      }).start()
    })
  }

  useEffect(() => {
    if (!isSessionActive) {
      return
    }

    const timer = setTimeout(() => {
      const phaseTicks =
        phase === 'Inhale'
          ? inhaleDuration
          : phase === 'Hold'
            ? holdDuration
            : exhaleDuration

      if (phaseCount < phaseTicks) {
        setPhaseCount((prev) => prev + 1)
        return
      }

      if (phase === 'Inhale') {
        if (hapticsEnabled)
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        setPhase(holdDuration > 0 ? 'Hold' : 'Exhale')
        setPhaseCount(1)
        return
      }

      if (phase === 'Hold') {
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
    if (phase === 'Hold') return

    Animated.timing(circleAnim, {
      toValue: phase === 'Inhale' ? 1 : 0,
      duration:
        TICK_MS * (phase === 'Inhale' ? inhaleDuration : exhaleDuration),
      useNativeDriver: true
    }).start()
  }, [phase, isSessionActive])

  const circleScale = circleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.7]
  })

  return (
    <Screen>
      {isSessionActive || isFinishing ? (
        <Animated.View
          style={[styles.sessionContainer, { opacity: finishFade }]}
        >
          <Text style={styles.sessionTitle}>Anchor</Text>

          <View style={styles.circleArea}>
            <View style={styles.circleWrapper}>
              <View style={styles.circleOuter} />
              <Animated.View
                style={[styles.circle, { transform: [{ scale: circleScale }] }]}
              />
              <View style={styles.circleInnerGuide} />
            </View>
          </View>

          {!isFinishing && (
            <>
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
                      i + 1 <= cycleCount
                        ? styles.dotActive
                        : styles.dotInactive
                    ]}
                  />
                ))}
              </View>

              <PrimaryButton
                label="Cancel"
                onPress={cancelSession}
                variant="secondary"
              />
            </>
          )}
        </Animated.View>
      ) : isSessionComplete ? (
        <Animated.View
          style={[styles.homeContainer, { opacity: completionFade }]}
        >
          <Text style={styles.title}>Anchor</Text>

          <View style={styles.section}>
            <Text style={styles.completionHeading}>Well done.</Text>
            <Text style={styles.subtitle}>
              You took a moment{`\n`}for yourself.
            </Text>
          </View>

          <Text style={styles.sessionBadge}>
            {sessionsToday} {sessionsToday === 1 ? 'session' : 'sessions'} today
          </Text>

          <View style={styles.actions}>
            <PrimaryButton label="Do another session" onPress={startSession} />
            <PrimaryButton
              label="Back home"
              onPress={() => setIsSessionComplete(false)}
              variant="secondary"
            />
          </View>
        </Animated.View>
      ) : (
        <View style={styles.homeContainer}>
          <View>
            <Text style={styles.title}>Anchor</Text>
            <Text style={styles.subtitle}>
              A tiny pause to come back to yourself
            </Text>
          </View>

          <Pressable
            style={styles.settingsCard}
            onPress={() => router.navigate('/settings')}
          >
            <Text style={styles.settingsCardLine}>{totalCycles} breaths</Text>
            <Text style={styles.settingsCardLine}>
              {inhaleDuration}s in
              {holdDuration > 0 ? ` · ${holdDuration}s hold` : ''} ·{' '}
              {exhaleDuration}s out
            </Text>
            <Text style={styles.settingsCardHint}>Tap to customize</Text>
          </Pressable>

          <PrimaryButton label="Start breathing" onPress={startSession} />

          {sessionsToday > 0 && (
            <Text style={styles.sessionBadge}>
              {sessionsToday} {sessionsToday === 1 ? 'session' : 'sessions'}{' '}
              today
            </Text>
          )}
        </View>
      )}
    </Screen>
  )
}

function makeStyles(c: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    homeContainer: {
      flex: 1,
      paddingHorizontal: 32,
      paddingVertical: 48,
      gap: 36,
      justifyContent: 'center'
    },
    title: {
      color: c.textDark,
      fontSize: 44,
      fontWeight: '700',
      letterSpacing: -1,
      lineHeight: 50,
      marginBottom: 8
    },
    subtitle: {
      color: c.textBody,
      fontSize: 17,
      lineHeight: 26
    },
    section: {
      gap: 8
    },
    completionHeading: {
      color: c.textDark,
      fontSize: 36,
      fontWeight: '700',
      letterSpacing: -0.6,
      lineHeight: 42
    },
    settingsCard: {
      backgroundColor: c.bgCard,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 18,
      gap: 2,
      alignSelf: 'flex-start'
    },
    settingsCardLine: {
      color: c.textBody,
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20
    },
    settingsCardHint: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '500',
      marginTop: 6
    },
    sessionBadge: {
      color: c.textMuted,
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
      color: c.textDark,
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: -0.3
    },
    circleArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    },
    circleWrapper: {
      width: 340,
      height: 340,
      alignItems: 'center',
      justifyContent: 'center'
    },
    circleOuter: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 340,
      height: 340,
      borderRadius: 170,
      backgroundColor: c.primary,
      opacity: c.circleOpacityOuter
    },
    circleInnerGuide: {
      position: 'absolute',
      top: 90,
      left: 90,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: c.primary,
      opacity: c.circleOpacityInner
    },
    circle: {
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: c.primary,
      opacity: c.circleOpacityMain
    },
    sessionInfo: {
      alignItems: 'center',
      gap: 2,
      marginBottom: 28
    },
    phaseText: {
      color: c.textBody,
      fontSize: 18,
      fontWeight: '500',
      letterSpacing: 1.2,
      textTransform: 'uppercase'
    },
    countText: {
      color: c.textDark,
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
      backgroundColor: c.primary
    },
    dotInactive: {
      backgroundColor: c.dot
    }
  })
}
