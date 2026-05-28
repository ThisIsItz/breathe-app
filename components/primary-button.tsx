import { Pressable, StyleSheet, Text } from 'react-native'

type Props = {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary'
}

export function PrimaryButton({ label, onPress, variant = 'primary' }: Props) {
  return (
    <Pressable
      style={variant === 'primary' ? styles.primary : styles.secondary}
      onPress={onPress}
    >
      <Text
        style={
          variant === 'primary' ? styles.primaryText : styles.secondaryText
        }
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: '#2E5E4E',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center'
  },
  primaryText: {
    color: '#F8F6F2',
    fontSize: 17,
    fontWeight: '600'
  },
  secondary: {
    backgroundColor: '#E5E0D7',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center'
  },
  secondaryText: {
    color: '#3A4942',
    fontSize: 17,
    fontWeight: '600'
  }
})
