import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

const TOTAL_BREATHS = 3
const TICK_MS = 1000

export default function HomeScreen() {
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [cycleCount, setCycleCount] = useState(1)
  const [phaseCount, setPhaseCount] = useState(1)
  const [phase, setPhase] = useState<'Inhale' | 'Exhale'>('Inhale')

  const startSession = () => {
    setCycleCount(1)
    setPhaseCount(1)
    setPhase('Inhale')
    setIsSessionActive(true)
  }

  const cancelSession = () => {
    setIsSessionActive(false)
    setCycleCount(1)
    setPhaseCount(1)
    setPhase('Inhale')
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

      cancelSession()
    }, TICK_MS)

    return () => clearTimeout(timer)
  }, [cycleCount, isSessionActive, phase, phaseCount])

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Anchor</Text>

        {isSessionActive ? (
          <>
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
