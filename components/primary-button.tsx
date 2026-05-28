import { useAppTheme } from '@/hooks/use-app-theme'
import { Pressable, StyleSheet, Text } from 'react-native'

type Props = {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary'
}

export function PrimaryButton({ label, onPress, variant = 'primary' }: Props) {
  const c = useAppTheme()
  return (
    <Pressable
      style={[
        variant === 'primary' ? styles.primary : styles.secondary,
        { backgroundColor: variant === 'primary' ? c.primary : c.bgCard }
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          variant === 'primary' ? styles.primaryText : styles.secondaryText,
          { color: variant === 'primary' ? c.textOnPrimary : c.pillText }
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  primary: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center'
  },
  primaryText: {
    fontSize: 17,
    fontWeight: '600'
  },
  secondary: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center'
  },
  secondaryText: {
    fontSize: 17,
    fontWeight: '600'
  }
})
