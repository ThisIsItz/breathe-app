import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'

const TICKS_PER_PHASE = 3
const TICK_MS = 1000
const PHASE_DURATION = TICK_MS * TICKS_PER_PHASE

const BREATH_OPTIONS = [3, 5] as const

const STORAGE_KEY_BREATHS = 'anchor:totalCycles'
const STORAGE_KEY_SESSIONS = 'anchor:completedSessions'

export default function HomeScreen() {
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isSessionComplete, setIsSessionComplete] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [totalCycles, setTotalCycles] = useState<3 | 5>(3)
  const [cycleCount, setCycleCount] = useState(1)
  const [phaseCount, setPhaseCount] = useState(1)
  const [phase, setPhase] = useState<'Inhale' | 'Exhale'>('Inhale')

  const circleAnim = useRef(new Animated.Value(0)).current
  const isLoaded = useRef(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [breaths, sessions] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_BREATHS),
          AsyncStorage.getItem(STORAGE_KEY_SESSIONS)
        ])
        if (breaths === '3' || breaths === '5')
          setTotalCycles(breaths === '5' ? 5 : 3)
        if (sessions !== null) setCompletedSessions(parseInt(sessions, 10))
      } catch {}
      isLoaded.current = true
    }
    load()
  }, [])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem(STORAGE_KEY_BREATHS, String(totalCycles)).catch(
      () => {}
    )
  }, [totalCycles])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem(STORAGE_KEY_SESSIONS, String(completedSessions)).catch(
      () => {}
    )
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
      if (phaseCount < TICKS_PER_PHASE) {
        setPhaseCount((prev) => prev + 1)
        return
      }

      if (phase === 'Inhale') {
        setPhase('Exhale')
        setPhaseCount(1)
        return
      }

      if (cycleCount < totalCycles) {
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
      duration: PHASE_DURATION,
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
                  i + 1 <= cycleCount ? styles.dotActive : styles.dotInactive,
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
            <Text style={styles.subtitle}>You took a moment{`\n`}for yourself.</Text>
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
            <Text style={styles.subtitle}>A tiny pause to come back{`\n`}to yourself</Text>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsLabel}>Breaths per session</Text>
            <View style={styles.selectorRow}>
              {BREATH_OPTIONS.map((n) => (
                <Pressable
                  key={n}
                  style={[
                    styles.selectorPill,
                    totalCycles === n && styles.selectorPillActive,
                  ]}
                  onPress={() => setTotalCycles(n)}
                >
                  <Text
                    style={[
                      styles.selectorPillText,
                      totalCycles === n && styles.selectorPillTextActive,
                    ]}
                  >
                    {n}
                  </Text>
                </Pressable>
              ))}
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
    backgroundColor: '#F5F1EA',
  },

  // Home + completion shared layout
  homeContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 36,
    justifyContent: 'center',
  },
  title: {
    color: '#1F2A24',
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 50,
    marginBottom: 8,
  },
  subtitle: {
    color: '#55635C',
    fontSize: 17,
    lineHeight: 26,
  },
  section: {
    gap: 8,
  },
  completionHeading: {
    color: '#1F2A24',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 42,
  },
  settingsSection: {
    gap: 12,
  },
  settingsLabel: {
    color: '#9AA49E',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorPill: {
    width: 72,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#E5E0D7',
    alignItems: 'center',
  },
  selectorPillActive: {
    backgroundColor: '#2E5E4E',
  },
  selectorPillText: {
    color: '#3A4942',
    fontSize: 20,
    fontWeight: '600',
  },
  selectorPillTextActive: {
    color: '#F8F6F2',
  },
  sessionBadge: {
    color: '#9AA49E',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  actions: {
    gap: 12,
  },
  button: {
    backgroundColor: '#2E5E4E',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonText: {
    color: '#F8F6F2',
    fontSize: 17,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#E5E0D7',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#3A4942',
    fontSize: 17,
    fontWeight: '600',
  },

  // Session layout
  sessionContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 40,
    paddingTop: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionTitle: {
    alignSelf: 'flex-start',
    color: '#1F2A24',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  circleArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#2E5E4E',
    opacity: 0.18,
  },
  sessionInfo: {
    alignItems: 'center',
    gap: 2,
    marginBottom: 28,
  },
  phaseText: {
    color: '#55635C',
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  countText: {
    color: '#1F2A24',
    fontSize: 64,
    fontWeight: '700',
    lineHeight: 72,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#2E5E4E',
  },
  dotInactive: {
    backgroundColor: '#C8C2B8',
  },
})
