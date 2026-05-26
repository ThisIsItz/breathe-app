import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'

const TOTAL_BREATHS = 3
const TICK_MS = 1000
const PHASE_DURATION = TICK_MS * TOTAL_BREATHS

export default function HomeScreen() {
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isSessionComplete, setIsSessionComplete] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [cycleCount, setCycleCount] = useState(1)
  const [phaseCount, setPhaseCount] = useState(1)
  const [phase, setPhase] = useState<'Inhale' | 'Exhale'>('Inhale')

  const circleAnim = useRef(new Animated.Value(0)).current

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
      if (phaseCount < TOTAL_BREATHS) {
        setPhaseCount((prev) => prev + 1)
        return
      }

      if (phase === 'Inhale') {
        setPhase('Exhale')
        setPhaseCount(1)
        return
      }

      if (cycleCount < TOTAL_BREATHS) {
        setCycleCount((prev) => prev + 1)
        setPhase('Inhale')
        setPhaseCount(1)
        return
      }

      completeSession()
    }, TICK_MS)

    return () => clearTimeout(timer)
  }, [cycleCount, isSessionActive, phase, phaseCount])

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
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Anchor</Text>

        {isSessionActive ? (
          <>
            <View style={styles.circleWrapper}>
              <Animated.View
                style={[styles.circle, { transform: [{ scale: circleScale }] }]}
              />
            </View>

            <Text style={styles.phaseText}>{phase}</Text>
            <Text style={styles.countText}>{phaseCount}</Text>
            <Text style={styles.sessionCountText}>
              Breath {cycleCount} of {TOTAL_BREATHS}
            </Text>

            <View style={styles.actions}>
              <Pressable style={styles.cancelButton} onPress={cancelSession}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </>
        ) : isSessionComplete ? (
          <>
            <Text style={styles.completionHeading}>Well done.</Text>
            <Text style={styles.subtitle}>You took a moment for yourself.</Text>
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
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              A tiny pause to come back to yourself
            </Text>

            <Pressable style={styles.button} onPress={startSession}>
              <Text style={styles.buttonText}>Start breathing</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1EA',
    paddingHorizontal: 24,
    justifyContent: 'center'
  },
  content: {
    gap: 16,
    alignItems: 'flex-start',
    maxWidth: 360
  },
  title: {
    color: '#1F2A24',
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 46
  },
  subtitle: {
    color: '#55635C',
    fontSize: 17,
    lineHeight: 24
  },
  completionHeading: {
    color: '#1F2A24',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 42
  },
  sessionBadge: {
    color: '#2E5E4E',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.4
  },
  phaseText: {
    color: '#1F2A24',
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36
  },
  countText: {
    color: '#55635C',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38
  },
  sessionCountText: {
    color: '#55635C',
    fontSize: 17,
    lineHeight: 24
  },
  circleWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center'
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2E5E4E',
    opacity: 0.25
  },
  actions: {
    marginTop: 8,
    gap: 12,
    width: '100%'
  },
  button: {
    backgroundColor: '#2E5E4E',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999
  },
  buttonText: {
    color: '#F8F6F2',
    fontSize: 16,
    fontWeight: '600'
  },
  cancelButton: {
    backgroundColor: '#E5E0D7',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999
  },
  cancelButtonText: {
    color: '#3A4942',
    fontSize: 16,
    fontWeight: '600'
  }
})
