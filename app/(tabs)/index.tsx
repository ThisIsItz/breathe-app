import { Pressable, StyleSheet, Text, View } from 'react-native'

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Anchor</Text>
        <Text style={styles.subtitle}>
          A tiny pause to come back to yourself
        </Text>

        <Pressable style={styles.button} onPress={() => {}}>
          <Text style={styles.buttonText}>Start breathing</Text>
        </Pressable>
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
  button: {
    marginTop: 8,
    backgroundColor: '#2E5E4E',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999
  },
  buttonText: {
    color: '#F8F6F2',
    fontSize: 16,
    fontWeight: '600'
  }
})
