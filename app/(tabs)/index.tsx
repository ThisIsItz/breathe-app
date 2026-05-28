import { Screen } from '@/components/screen'
import { useAppTheme } from '@/hooks/use-app-theme'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import * as Notifications from 'expo-notifications'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native'

const TICK_MS = 1000

const COMPLETION_MESSAGES = [
  { heading: 'A quiet moment.', body: 'Sometimes that is enough.' },
  { heading: 'Still here.', body: 'A little more grounded.' },
  { heading: 'You showed up.', body: 'That matters.' },
  { heading: 'Gently done.', body: 'You made space for yourself.' },
  { heading: 'Present again.', body: 'Right here, right now.' },
  { heading: 'A small pause.', body: 'It can change a lot.' },
  { heading: 'A gentle pause', body: 'You gave yourself a moment of quiet.' },
  {
    heading: 'A moment of stillness.',
    body: 'The world can wait a little longer.'
  }
] as const

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
  const [completionMessage, setCompletionMessage] = useState<
    (typeof COMPLETION_MESSAGES)[number]
  >(COMPLETION_MESSAGES[0])

  const circleAnim = useRef(new Animated.Value(0)).current
  const [isFinishing, setIsFinishing] = useState(false)
  const finishFade = useRef(new Animated.Value(1)).current
  const completionFade = useRef(new Animated.Value(0)).current
  const homeOrbAnim = useRef(new Animated.Value(0)).current
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

      return () => {
        setIsSessionComplete(false)
        completionFade.setValue(0)
      }
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
    setCompletionMessage(
      COMPLETION_MESSAGES[
        Math.floor(Math.random() * COMPLETION_MESSAGES.length)
      ]
    )
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
    Animated.loop(
      Animated.sequence([
        Animated.timing(homeOrbAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(homeOrbAnim, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    ).start()
  }, [])

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

  const homeOrbScale = homeOrbAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.1]
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

          <View
            style={[styles.sessionControls, { opacity: isFinishing ? 0 : 1 }]}
          >
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

            <Pressable
              onPress={cancelSession}
              hitSlop={12}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>cancel</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : isSessionComplete ? (
        <Animated.View
          style={[styles.homeContainer, { opacity: completionFade }]}
        >
          <Text style={styles.title}>Anchor</Text>

          <View style={styles.completionContent}>
            <Text style={styles.completionHeading}>
              {completionMessage.heading}
            </Text>
            <Text style={styles.completionBody}>{completionMessage.body}</Text>
          </View>

          <View style={styles.completionFooter}>
            <Text style={styles.sessionBadge}>
              {sessionsToday} {sessionsToday === 1 ? 'session' : 'sessions'}{' '}
              today
            </Text>
            <View style={styles.completionActions}>
              <Pressable onPress={startSession} hitSlop={12}>
                <Text style={styles.completionActionLink}>Again</Text>
              </Pressable>
              <Text style={styles.completionActionDot}>·</Text>
              <Pressable
                onPress={() => setIsSessionComplete(false)}
                hitSlop={12}
              >
                <Text style={styles.completionActionLink}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      ) : (
        <View style={styles.homeContainer}>
          <View style={styles.homeHeader}>
            <Text style={styles.title}>Anchor</Text>
            <Text style={styles.tagline}>
              Take a few breaths and come back to the present moment.
            </Text>
          </View>

          <View style={styles.homeOrbContainer}>
            <Animated.View
              pointerEvents="none"
              style={[styles.homeOrb, { transform: [{ scale: homeOrbScale }] }]}
            />
          </View>

          <Pressable
            style={styles.settingsLink}
            onPress={() => router.navigate('/settings')}
          >
            <Text style={styles.settingsText}>
              {inhaleDuration}s in
              {holdDuration > 0 ? ` · ${holdDuration}s hold` : ''} ·{' '}
              {exhaleDuration}s out · {totalCycles}{' '}
              {totalCycles === 1 ? 'breath' : 'breaths'}
            </Text>
            <Text style={styles.settingsHint}>customize ›</Text>
          </Pressable>

          <View style={styles.startArea}>
            <Pressable style={styles.startButton} onPress={startSession}>
              <Text style={styles.startButtonText}>Breathe</Text>
            </Pressable>
            {sessionsToday > 0 && (
              <Text style={styles.sessionBadge}>
                {sessionsToday} {sessionsToday === 1 ? 'session' : 'sessions'}{' '}
                today
              </Text>
            )}
          </View>
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
      paddingTop: 60,
      paddingBottom: 52,
      justifyContent: 'space-between'
    },
    homeOrbContainer: {
      alignItems: 'center'
    },
    homeOrb: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.primary,
      opacity: c.circleOpacityInner
    },
    homeHeader: {
      gap: 6
    },
    title: {
      color: c.textDark,
      fontSize: 28,
      fontWeight: '600',
      letterSpacing: -0.5
    },
    tagline: {
      color: c.textMuted,
      fontSize: 15,
      lineHeight: 22,
      maxWidth: 250
    },
    settingsLink: {
      gap: 4
    },
    settingsText: {
      color: c.textBody,
      fontSize: 15,
      fontWeight: '500',
      lineHeight: 22
    },
    settingsHint: {
      color: c.textMuted,
      fontSize: 13
    },
    startArea: {
      alignItems: 'center',
      gap: 16
    },
    startButton: {
      backgroundColor: c.primary,
      paddingVertical: 14,
      paddingHorizontal: 44,
      borderRadius: 999
    },
    startButtonText: {
      color: c.textOnPrimary,
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.2
    },
    sessionBadge: {
      color: c.textFaint,
      fontSize: 12,
      letterSpacing: 0.2,
      textAlign: 'center'
    },
    completionContent: {
      gap: 10
    },
    completionHeading: {
      color: c.textDark,
      fontSize: 30,
      fontWeight: '600',
      letterSpacing: -0.5,
      lineHeight: 36
    },
    completionBody: {
      color: c.textBody,
      fontSize: 17,
      lineHeight: 26
    },
    completionFooter: {
      alignItems: 'center',
      gap: 16
    },
    completionActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14
    },
    completionActionLink: {
      color: c.textBody,
      fontSize: 16,
      fontWeight: '500'
    },
    completionActionDot: {
      color: c.textFaint,
      fontSize: 16
    },
    cancelBtn: {
      paddingBottom: 8,
      alignSelf: 'center'
    },
    cancelText: {
      color: c.textMuted,
      fontSize: 15,
      fontWeight: '500',
      letterSpacing: 0.3
    },
    sessionControls: {
      alignItems: 'center',
      width: '100%'
    },
    sessionContainer: {
      flex: 1,
      paddingHorizontal: 32,
      paddingBottom: 52,
      paddingTop: 16,
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    sessionTitle: {
      alignSelf: 'flex-start',
      color: c.textDark,
      fontSize: 18,
      fontWeight: '600',
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
