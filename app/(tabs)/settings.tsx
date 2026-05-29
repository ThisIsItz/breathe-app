import { Screen } from '@/components/screen'
import { SettingRow } from '@/components/setting-row'
import { useAppTheme } from '@/hooks/use-app-theme'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker, {
  DateTimePickerEvent
} from '@react-native-community/datetimepicker'
import * as Notifications from 'expo-notifications'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'

const BREATH_PRESETS: number[] = [3, 5, 10]
const CUSTOM_RANGE = Array.from({ length: 20 }, (_, i) => i + 1)

const INHALE_RANGE = Array.from({ length: 10 }, (_, i) => i + 1)
const EXHALE_RANGE = Array.from({ length: 15 }, (_, i) => i + 1)

const INHALE_OPTIONS = INHALE_RANGE.map((n) => ({ label: `${n}s`, value: n }))
const EXHALE_OPTIONS = EXHALE_RANGE.map((n) => ({ label: `${n}s`, value: n }))
const HOLD_OPTIONS = [0, 1, 2, 3].map((n) => ({
  label: n === 0 ? 'Off' : `${n}s`,
  value: n
}))
const CUSTOM_OPTIONS = CUSTOM_RANGE.map((n) => ({ label: `${n}`, value: n }))

const PRESETS = [
  { name: 'Relax', inhale: 4, hold: 1, exhale: 6, cycles: 5 },
  { name: 'Focus', inhale: 3, hold: 0, exhale: 3, cycles: 3 },
  { name: 'Sleep', inhale: 4, hold: 2, exhale: 8, cycles: 5 }
] as const

type Preset = (typeof PRESETS)[number]

type ReminderMode = 'off' | '1h' | '2h' | '4h' | 'daily'

const REMINDER_OPTIONS: Array<{ value: ReminderMode; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: '1h', label: 'Every hour' },
  { value: '2h', label: 'Every 2 hours' },
  { value: '4h', label: 'Every 4 hours' },
  { value: 'daily', label: 'Daily' }
]

const CHANNEL_ID = 'anchor-reminders'

const formatTime = (h: number, m: number) => {
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

function isInQuietHours(
  h: number,
  m: number,
  quietEnabled: boolean,
  quietStartHour: number,
  quietStartMinute: number,
  quietEndHour: number,
  quietEndMinute: number
): boolean {
  if (!quietEnabled) return false
  const t = h * 60 + m
  const qStart = quietStartHour * 60 + quietStartMinute
  const qEnd = quietEndHour * 60 + quietEndMinute
  if (qStart === qEnd) return false
  if (qStart < qEnd) return t >= qStart && t < qEnd
  return t >= qStart || t < qEnd
}

async function applyReminder(
  mode: ReminderMode,
  hour: number,
  minute: number,
  quietEnabled: boolean,
  quietStartHour: number,
  quietStartMinute: number,
  quietEndHour: number,
  quietEndMinute: number
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
  if (mode === 'off') return

  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Breathing reminders',
      importance: Notifications.AndroidImportance.DEFAULT
    })
  }

  const content: Notifications.NotificationContentInput = {
    title: 'Time to breathe',
    body: 'Take a moment for yourself.'
  }

  if (mode === 'daily') {
    if (
      !isInQuietHours(
        hour,
        minute,
        quietEnabled,
        quietStartHour,
        quietStartMinute,
        quietEndHour,
        quietEndMinute
      )
    ) {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute: 0,
          channelId: CHANNEL_ID
        }
      })
    }
    return
  }

  if (!quietEnabled) {
    const seconds = mode === '1h' ? 3600 : mode === '2h' ? 7200 : 14400
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: true,
        channelId: CHANNEL_ID
      }
    })
    return
  }

  const intervalHours = mode === '1h' ? 1 : mode === '2h' ? 2 : 4
  const now = new Date()
  const scheduled: Promise<string>[] = []
  for (let day = 0; day < 8 && scheduled.length < 60; day++) {
    for (let h = 0; h < 24 && scheduled.length < 60; h += intervalHours) {
      if (
        isInQuietHours(
          h,
          0,
          quietEnabled,
          quietStartHour,
          quietStartMinute,
          quietEndHour,
          quietEndMinute
        )
      )
        continue
      const trigger = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + day,
        h,
        0,
        0
      )
      if (trigger.getTime() <= now.getTime()) continue
      scheduled.push(
        Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: trigger,
            channelId: CHANNEL_ID
          }
        })
      )
    }
  }
  await Promise.all(scheduled)
}

type SelectOption = { label: string; value: number }

function PickerSelector({
  value,
  options,
  onValueChange
}: {
  value: number
  options: SelectOption[]
  onValueChange: (value: number) => void
}) {
  const c = useAppTheme()
  const styles = makeStyles(c)
  const [visible, setVisible] = useState(false)
  const currentLabel =
    options.find((o) => o.value === value)?.label ?? String(value)

  const select = (v: number) => {
    onValueChange(v)
    setVisible(false)
  }

  return (
    <>
      <Pressable style={styles.selectorField} onPress={() => setVisible(true)}>
        <Text style={styles.selectorValue}>{currentLabel}</Text>
        <Text style={styles.selectorChevron}>{'\u203a'}</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOuter}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setVisible(false)}
          />
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
              {options.map((opt, i) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.modalOption,
                    i < options.length - 1 && styles.modalOptionBorder
                  ]}
                  onPress={() => select(opt.value)}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      opt.value === value && styles.modalOptionTextSelected
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {opt.value === value && (
                    <View style={styles.modalOptionDot} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={styles.modalCancelBtn}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </View>
      </Modal>
    </>
  )
}

export default function SettingsScreen() {
  const c = useAppTheme()
  const styles = makeStyles(c)
  const [totalCycles, setTotalCycles] = useState<number>(3)
  const [inhaleDuration, setInhaleDuration] = useState<number>(4)
  const [holdDuration, setHoldDuration] = useState<number>(0)
  const [exhaleDuration, setExhaleDuration] = useState<number>(6)
  const [hapticsEnabled, setHapticsEnabled] = useState(true)
  const [reminderMode, setReminderMode] = useState<ReminderMode>('off')
  const [dailyHour, setDailyHour] = useState(9)
  const [dailyMinute, setDailyMinute] = useState(0)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [showHoldInfo, setShowHoldInfo] = useState(false)
  const [quietEnabled, setQuietEnabled] = useState(false)
  const [quietStartHour, setQuietStartHour] = useState(22)
  const [quietStartMinute, setQuietStartMinute] = useState(0)
  const [quietEndHour, setQuietEndHour] = useState(8)
  const [quietEndMinute, setQuietEndMinute] = useState(0)
  const [showQuietStartPicker, setShowQuietStartPicker] = useState(false)
  const [showQuietEndPicker, setShowQuietEndPicker] = useState(false)

  const isLoaded = useRef(false)
  const savedOpacityAnim = useRef(new Animated.Value(0)).current
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [
          breaths,
          inhale,
          hold,
          exhale,
          haptics,
          reminder,
          savedHour,
          savedMinute,
          qEnabled,
          qStartH,
          qStartM,
          qEndH,
          qEndM
        ] = await Promise.all([
          AsyncStorage.getItem('anchor:totalCycles'),
          AsyncStorage.getItem('anchor:inhaleDuration'),
          AsyncStorage.getItem('anchor:holdDuration'),
          AsyncStorage.getItem('anchor:exhaleDuration'),
          AsyncStorage.getItem('anchor:haptics'),
          AsyncStorage.getItem('anchor:reminderMode'),
          AsyncStorage.getItem('anchor:dailyHour'),
          AsyncStorage.getItem('anchor:dailyMinute'),
          AsyncStorage.getItem('anchor:quietEnabled'),
          AsyncStorage.getItem('anchor:quietStartHour'),
          AsyncStorage.getItem('anchor:quietStartMinute'),
          AsyncStorage.getItem('anchor:quietEndHour'),
          AsyncStorage.getItem('anchor:quietEndMinute')
        ])
        const pb = breaths ? parseInt(breaths, 10) : null
        if (pb !== null && pb >= 1 && pb <= 20) setTotalCycles(pb)
        const pi = inhale ? parseInt(inhale, 10) : null
        if (pi !== null && pi >= 1 && pi <= 10) setInhaleDuration(pi)
        const ph2 = hold ? parseInt(hold, 10) : null
        if (ph2 !== null && ph2 >= 0 && ph2 <= 3) setHoldDuration(ph2)
        const pe = exhale ? parseInt(exhale, 10) : null
        if (pe !== null && pe >= 1 && pe <= 15) setExhaleDuration(pe)
        if (haptics === 'false') setHapticsEnabled(false)
        const validModes: ReminderMode[] = ['off', '1h', '2h', '4h', 'daily']
        if (reminder && validModes.includes(reminder as ReminderMode))
          setReminderMode(reminder as ReminderMode)
        const ph = savedHour ? parseInt(savedHour, 10) : null
        if (ph !== null && ph >= 0 && ph <= 23) setDailyHour(ph)
        const pm = savedMinute ? parseInt(savedMinute, 10) : null
        if (pm !== null && pm >= 0 && pm <= 59) setDailyMinute(pm)
        if (qEnabled === 'true') setQuietEnabled(true)
        const pqsh = qStartH ? parseInt(qStartH, 10) : null
        if (pqsh !== null && pqsh >= 0 && pqsh <= 23) setQuietStartHour(pqsh)
        const pqsm = qStartM ? parseInt(qStartM, 10) : null
        if (pqsm !== null && pqsm >= 0 && pqsm <= 59) setQuietStartMinute(pqsm)
        const pqeh = qEndH ? parseInt(qEndH, 10) : null
        if (pqeh !== null && pqeh >= 0 && pqeh <= 23) setQuietEndHour(pqeh)
        const pqem = qEndM ? parseInt(qEndM, 10) : null
        if (pqem !== null && pqem >= 0 && pqem <= 59) setQuietEndMinute(pqem)
      } catch {}
      isLoaded.current = true
    }
    load()
  }, [])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:totalCycles', String(totalCycles)).catch(
      () => {}
    )
  }, [totalCycles])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:inhaleDuration', String(inhaleDuration)).catch(
      () => {}
    )
  }, [inhaleDuration])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:holdDuration', String(holdDuration)).catch(
      () => {}
    )
  }, [holdDuration])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:exhaleDuration', String(exhaleDuration)).catch(
      () => {}
    )
  }, [exhaleDuration])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:haptics', String(hapticsEnabled)).catch(
      () => {}
    )
  }, [hapticsEnabled])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:reminderMode', reminderMode).catch(() => {})
  }, [reminderMode])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:dailyHour', String(dailyHour)).catch(() => {})
  }, [dailyHour])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:dailyMinute', String(dailyMinute)).catch(
      () => {}
    )
  }, [dailyMinute])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:quietEnabled', String(quietEnabled)).catch(
      () => {}
    )
  }, [quietEnabled])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:quietStartHour', String(quietStartHour)).catch(
      () => {}
    )
  }, [quietStartHour])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem(
      'anchor:quietStartMinute',
      String(quietStartMinute)
    ).catch(() => {})
  }, [quietStartMinute])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:quietEndHour', String(quietEndHour)).catch(
      () => {}
    )
  }, [quietEndHour])

  useEffect(() => {
    if (!isLoaded.current) return
    AsyncStorage.setItem('anchor:quietEndMinute', String(quietEndMinute)).catch(
      () => {}
    )
  }, [quietEndMinute])

  const flashSaved = useCallback(() => {
    if (savedTimer.current) clearTimeout(savedTimer.current)
    Animated.timing(savedOpacityAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true
    }).start()
    savedTimer.current = setTimeout(() => {
      Animated.timing(savedOpacityAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      }).start()
    }, 1200)
  }, [savedOpacityAnim])

  useEffect(() => {
    if (!isLoaded.current) return
    flashSaved()
  }, [
    totalCycles,
    inhaleDuration,
    holdDuration,
    exhaleDuration,
    hapticsEnabled,
    reminderMode,
    dailyHour,
    dailyMinute,
    quietEnabled,
    quietStartHour,
    quietStartMinute,
    quietEndHour,
    quietEndMinute,
    flashSaved
  ])

  const handleReminderChange = (mode: ReminderMode) => {
    setReminderMode(mode)
    applyReminder(
      mode,
      dailyHour,
      dailyMinute,
      quietEnabled,
      quietStartHour,
      quietStartMinute,
      quietEndHour,
      quietEndMinute
    ).catch(() => {})
  }

  const handleTimeChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === 'android') setShowTimePicker(false)
    if (!selectedDate) return
    const h = selectedDate.getHours()
    const m = selectedDate.getMinutes()
    setDailyHour(h)
    setDailyMinute(m)
    if (reminderMode === 'daily') {
      applyReminder(
        'daily',
        h,
        m,
        quietEnabled,
        quietStartHour,
        quietStartMinute,
        quietEndHour,
        quietEndMinute
      ).catch(() => {})
    }
  }

  const handleQuietEnabledChange = (enabled: boolean) => {
    setQuietEnabled(enabled)
    if (reminderMode !== 'off') {
      applyReminder(
        reminderMode,
        dailyHour,
        dailyMinute,
        enabled,
        quietStartHour,
        quietStartMinute,
        quietEndHour,
        quietEndMinute
      ).catch(() => {})
    }
  }

  const handleQuietStartChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === 'android') setShowQuietStartPicker(false)
    if (!selectedDate) return
    const h = selectedDate.getHours()
    const m = selectedDate.getMinutes()
    setQuietStartHour(h)
    setQuietStartMinute(m)
    if (reminderMode !== 'off') {
      applyReminder(
        reminderMode,
        dailyHour,
        dailyMinute,
        quietEnabled,
        h,
        m,
        quietEndHour,
        quietEndMinute
      ).catch(() => {})
    }
  }

  const handleQuietEndChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === 'android') setShowQuietEndPicker(false)
    if (!selectedDate) return
    const h = selectedDate.getHours()
    const m = selectedDate.getMinutes()
    setQuietEndHour(h)
    setQuietEndMinute(m)
    if (reminderMode !== 'off') {
      applyReminder(
        reminderMode,
        dailyHour,
        dailyMinute,
        quietEnabled,
        quietStartHour,
        quietStartMinute,
        h,
        m
      ).catch(() => {})
    }
  }

  const isCustom = !BREATH_PRESETS.includes(totalCycles)

  const activePreset =
    PRESETS.find(
      (p) =>
        p.inhale === inhaleDuration &&
        p.hold === holdDuration &&
        p.exhale === exhaleDuration &&
        p.cycles === totalCycles
    ) ?? null

  const applyPreset = (p: Preset) => {
    setInhaleDuration(p.inhale)
    setHoldDuration(p.hold)
    setExhaleDuration(p.exhale)
    setTotalCycles(p.cycles)
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Presets</Text>
          <View style={styles.presetsRow}>
            {PRESETS.map((p) => {
              const isActive = activePreset?.name === p.name
              const pattern = `${p.inhale} · ${p.hold > 0 ? p.hold : '–'} · ${p.exhale}`
              return (
                <Pressable
                  key={p.name}
                  style={[
                    styles.presetCard,
                    isActive && styles.presetCardActive
                  ]}
                  onPress={() => applyPreset(p)}
                >
                  <Text
                    style={[
                      styles.presetName,
                      isActive && styles.presetNameActive
                    ]}
                  >
                    {p.name}
                  </Text>
                  <Text
                    style={[
                      styles.presetPattern,
                      isActive && styles.presetPatternActive
                    ]}
                  >
                    {pattern}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Breathing</Text>
          <View style={styles.group}>
            <SettingRow label="Breaths per session">
              <View style={styles.row}>
                {BREATH_PRESETS.map((n) => (
                  <Pressable
                    key={n}
                    style={[
                      styles.pill,
                      totalCycles === n && styles.pillActive
                    ]}
                    onPress={() => setTotalCycles(n)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        totalCycles === n && styles.pillTextActive
                      ]}
                    >
                      {n}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  style={[styles.pillWide, isCustom && styles.pillActive]}
                  onPress={() => {
                    if (!isCustom) setTotalCycles(7)
                  }}
                >
                  <Text
                    style={[styles.pillText, isCustom && styles.pillTextActive]}
                  >
                    Custom
                  </Text>
                </Pressable>
              </View>
              {isCustom && (
                <PickerSelector
                  value={totalCycles}
                  options={CUSTOM_OPTIONS}
                  onValueChange={setTotalCycles}
                />
              )}
            </SettingRow>

            <View style={styles.paceRow}>
              <View style={styles.paceItem}>
                <Text style={styles.paceLabel}>Inhale</Text>
                <PickerSelector
                  value={inhaleDuration}
                  options={INHALE_OPTIONS}
                  onValueChange={setInhaleDuration}
                />
              </View>
              <View style={styles.paceItem}>
                <View style={styles.holdLabelRow}>
                  <Text style={styles.paceLabel}>Hold</Text>
                  <Pressable
                    onPress={() => setShowHoldInfo(true)}
                    style={styles.holdInfoBtn}
                    hitSlop={8}
                  >
                    <Text style={styles.holdInfoIcon}>i</Text>
                  </Pressable>
                </View>
                <PickerSelector
                  value={holdDuration}
                  options={HOLD_OPTIONS}
                  onValueChange={setHoldDuration}
                />
              </View>
              <View style={styles.paceItem}>
                <Text style={styles.paceLabel}>Exhale</Text>
                <PickerSelector
                  value={exhaleDuration}
                  options={EXHALE_OPTIONS}
                  onValueChange={setExhaleDuration}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          <View style={styles.group}>
            <SettingRow label="Reminder">
              <View style={styles.optionList}>
                {REMINDER_OPTIONS.map(({ value, label }, i) => {
                  const active = reminderMode === value
                  return (
                    <Pressable
                      key={value}
                      style={[
                        styles.optionRow,
                        i < REMINDER_OPTIONS.length - 1 &&
                          styles.optionRowBorder
                      ]}
                      onPress={() => handleReminderChange(value)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          active && styles.optionTextActive
                        ]}
                      >
                        {label}
                      </Text>
                      <View
                        style={[
                          styles.optionDot,
                          active && styles.optionDotActive
                        ]}
                      />
                    </Pressable>
                  )
                })}
              </View>
              {reminderMode === 'daily' && Platform.OS === 'ios' && (
                <View style={[styles.pickerWrapper, styles.pickerWrapperIos]}>
                  <DateTimePicker
                    value={new Date(2000, 0, 1, dailyHour, dailyMinute, 0)}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                  />
                </View>
              )}
              {reminderMode === 'daily' && Platform.OS !== 'ios' && (
                <>
                  <Pressable
                    style={styles.timeDisplay}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={styles.timeDisplayText}>
                      {formatTime(dailyHour, dailyMinute)}
                    </Text>
                    <Text style={styles.timeDisplayHint}>{'›'}</Text>
                  </Pressable>
                  {showTimePicker && (
                    <DateTimePicker
                      value={new Date(2000, 0, 1, dailyHour, dailyMinute, 0)}
                      mode="time"
                      display="default"
                      onChange={handleTimeChange}
                    />
                  )}
                </>
              )}
            </SettingRow>

            {(['1h', '2h', '4h'] as ReminderMode[]).includes(reminderMode) && (
              <>
                <SettingRow label="Quiet hours">
                  <View style={styles.row}>
                    {([false, true] as const).map((value) => (
                      <Pressable
                        key={String(value)}
                        style={[
                          styles.tagPill,
                          quietEnabled === value && styles.pillActive
                        ]}
                        onPress={() => handleQuietEnabledChange(value)}
                      >
                        <Text
                          style={[
                            styles.tagPillText,
                            quietEnabled === value && styles.pillTextActive
                          ]}
                        >
                          {value ? 'On' : 'Off'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </SettingRow>

                {quietEnabled && (
                  <>
                    <View style={styles.quietTimeRow}>
                      <View style={styles.quietTimeItem}>
                        <Text style={styles.paceLabel}>Start</Text>
                        {Platform.OS === 'ios' ? (
                          <View
                            style={[
                              styles.pickerWrapper,
                              styles.pickerWrapperIos
                            ]}
                          >
                            <DateTimePicker
                              value={
                                new Date(
                                  2000,
                                  0,
                                  1,
                                  quietStartHour,
                                  quietStartMinute,
                                  0
                                )
                              }
                              mode="time"
                              display="spinner"
                              onChange={handleQuietStartChange}
                            />
                          </View>
                        ) : (
                          <>
                            <Pressable
                              style={styles.timeDisplay}
                              onPress={() => setShowQuietStartPicker(true)}
                            >
                              <Text style={styles.timeDisplayText}>
                                {formatTime(quietStartHour, quietStartMinute)}
                              </Text>
                              <Text style={styles.timeDisplayHint}>{'›'}</Text>
                            </Pressable>
                            {showQuietStartPicker && (
                              <DateTimePicker
                                value={
                                  new Date(
                                    2000,
                                    0,
                                    1,
                                    quietStartHour,
                                    quietStartMinute,
                                    0
                                  )
                                }
                                mode="time"
                                display="default"
                                onChange={handleQuietStartChange}
                              />
                            )}
                          </>
                        )}
                      </View>
                      <View style={styles.quietTimeItem}>
                        <Text style={styles.paceLabel}>End</Text>
                        {Platform.OS === 'ios' ? (
                          <View
                            style={[
                              styles.pickerWrapper,
                              styles.pickerWrapperIos
                            ]}
                          >
                            <DateTimePicker
                              value={
                                new Date(
                                  2000,
                                  0,
                                  1,
                                  quietEndHour,
                                  quietEndMinute,
                                  0
                                )
                              }
                              mode="time"
                              display="spinner"
                              onChange={handleQuietEndChange}
                            />
                          </View>
                        ) : (
                          <>
                            <Pressable
                              style={styles.timeDisplay}
                              onPress={() => setShowQuietEndPicker(true)}
                            >
                              <Text style={styles.timeDisplayText}>
                                {formatTime(quietEndHour, quietEndMinute)}
                              </Text>
                              <Text style={styles.timeDisplayHint}>{'›'}</Text>
                            </Pressable>
                            {showQuietEndPicker && (
                              <DateTimePicker
                                value={
                                  new Date(
                                    2000,
                                    0,
                                    1,
                                    quietEndHour,
                                    quietEndMinute,
                                    0
                                  )
                                }
                                mode="time"
                                display="default"
                                onChange={handleQuietEndChange}
                              />
                            )}
                          </>
                        )}
                      </View>
                    </View>
                    <Text style={styles.quietHint}>
                      No reminders will be sent during this time.
                    </Text>
                  </>
                )}
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.group}>
            <SettingRow label="Haptics">
              <View style={styles.row}>
                {([true, false] as const).map((value) => (
                  <Pressable
                    key={String(value)}
                    style={[
                      styles.tagPill,
                      hapticsEnabled === value && styles.pillActive
                    ]}
                    onPress={() => setHapticsEnabled(value)}
                  >
                    <Text
                      style={[
                        styles.tagPillText,
                        hapticsEnabled === value && styles.pillTextActive
                      ]}
                    >
                      {value ? 'On' : 'Off'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </SettingRow>
          </View>
        </View>

        <View style={styles.supportSection}>
          <Text style={styles.supportText}>
            If Anchor helped you slow down for a moment, you can support the
            project here.
          </Text>
          <Pressable
            style={styles.supportButton}
            onPress={() => Linking.openURL('https://ko-fi.com/thisisitz')}
          >
            <Text style={styles.supportButtonText}>Buy me a coffee ☕</Text>
          </Pressable>
        </View>
      </ScrollView>
      <Animated.View
        pointerEvents="none"
        style={[styles.toast, { opacity: savedOpacityAnim }]}
      >
        <Text style={styles.toastText}>Saved</Text>
      </Animated.View>

      <Modal
        visible={showHoldInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHoldInfo(false)}
      >
        <View style={styles.modalOuter}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowHoldInfo(false)}
          />
          <View style={styles.holdInfoSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.holdInfoHeading}>About breath holds</Text>
            <Text style={styles.holdInfoBody}>
              {
                'Use breath holds only if they feel comfortable for you.\n\nIf you are pregnant or have respiratory or cardiovascular conditions, consider avoiding long breath holds.'
              }
            </Text>
            <Pressable
              style={styles.modalCancelBtn}
              onPress={() => setShowHoldInfo(false)}
            >
              <Text style={styles.modalCancelText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

function makeStyles(c: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 32,
      paddingTop: 48,
      paddingBottom: 40,
      gap: 36
    },
    heading: {
      color: c.textDark,
      fontSize: 32,
      fontWeight: '700',
      letterSpacing: -0.8
    },
    toast: {
      position: 'absolute',
      bottom: 32,
      alignSelf: 'center',
      backgroundColor: c.primary,
      paddingVertical: 8,
      paddingHorizontal: 20,
      borderRadius: 999,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3
    },
    toastText: {
      color: c.textOnPrimary,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.3
    },
    section: {
      gap: 16
    },
    sectionTitle: {
      color: c.textDark,
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: -0.4
    },
    group: {
      gap: 24
    },
    row: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap'
    },
    pill: {
      width: 72,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: c.bgCard,
      alignItems: 'center'
    },
    pillActive: {
      backgroundColor: c.primary
    },
    pillText: {
      color: c.pillText,
      fontSize: 20,
      fontWeight: '600'
    },
    pillTextActive: {
      color: c.textOnPrimary
    },
    pillWide: {
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: c.bgCard,
      alignItems: 'center' as const
    },
    tagPill: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: c.bgCard,
      alignItems: 'center',
      minWidth: 56
    },
    tagPillText: {
      color: c.pillText,
      fontSize: 14,
      fontWeight: '600'
    },
    optionList: {
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: c.bgList
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
      paddingHorizontal: 16
    },
    optionRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border
    },
    optionText: {
      color: c.textBody,
      fontSize: 15,
      fontWeight: '500'
    },
    optionTextActive: {
      color: c.primary,
      fontWeight: '600'
    },
    optionDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: c.dot
    },
    optionDotActive: {
      backgroundColor: c.primary,
      borderColor: c.primary
    },
    timeDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: c.bgList,
      borderRadius: 14,
      marginTop: 4
    },
    timeDisplayText: {
      color: c.textDark,
      fontSize: 17,
      fontWeight: '600'
    },
    timeDisplayHint: {
      color: c.textMuted,
      fontSize: 20
    },
    paceRow: {
      flexDirection: 'row',
      gap: 12
    },
    paceItem: {
      flex: 1,
      gap: 8
    },
    holdLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5
    },
    holdInfoBtn: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: c.textFaint,
      alignItems: 'center',
      justifyContent: 'center'
    },
    holdInfoIcon: {
      color: c.textFaint,
      fontSize: 8,
      fontWeight: '700',
      lineHeight: 10
    },
    holdInfoSheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingBottom: 36,
      paddingHorizontal: 24
    },
    holdInfoHeading: {
      color: c.textDark,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12
    },
    holdInfoBody: {
      color: c.textBody,
      fontSize: 15,
      lineHeight: 24,
      marginBottom: 24
    },
    paceLabel: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase'
    },
    pickerWrapper: {
      backgroundColor: c.bgList,
      borderRadius: 14,
      overflow: 'hidden'
    },
    pickerWrapperIos: {
      height: 160
    },
    selectorField: {
      backgroundColor: c.bgList,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    selectorValue: {
      color: c.textDark,
      fontSize: 16,
      fontWeight: '500'
    },
    selectorChevron: {
      color: c.textMuted,
      fontSize: 20,
      transform: [{ rotate: '90deg' }]
    },
    modalOuter: {
      flex: 1,
      justifyContent: 'flex-end'
    },
    modalBackdrop: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: c.modalOverlay
    },
    modalSheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingBottom: 36,
      paddingHorizontal: 16
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.dot,
      alignSelf: 'center',
      marginBottom: 16
    },
    modalScroll: {
      maxHeight: 380
    },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 15,
      paddingHorizontal: 16
    },
    modalOptionBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border
    },
    modalOptionText: {
      color: c.textBody,
      fontSize: 16,
      fontWeight: '500'
    },
    modalOptionTextSelected: {
      color: c.primary,
      fontWeight: '600'
    },
    modalOptionDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.primary
    },
    modalCancelBtn: {
      marginTop: 8,
      paddingVertical: 16,
      alignItems: 'center',
      backgroundColor: c.bgList,
      borderRadius: 14
    },
    modalCancelText: {
      color: c.textBody,
      fontSize: 15,
      fontWeight: '600'
    },
    quietTimeRow: {
      flexDirection: 'row',
      gap: 12
    },
    quietTimeItem: {
      flex: 1,
      gap: 8
    },
    quietHint: {
      color: c.textMuted,
      fontSize: 13,
      lineHeight: 18
    },
    presetsRow: {
      flexDirection: 'row' as const,
      gap: 10
    },
    presetCard: {
      flex: 1,
      paddingVertical: 18,
      paddingHorizontal: 12,
      borderRadius: 18,
      backgroundColor: c.bgCard,
      alignItems: 'center' as const,
      gap: 6
    },
    presetCardActive: {
      backgroundColor: c.primary
    },
    presetName: {
      color: c.textDark,
      fontSize: 15,
      fontWeight: '600' as const
    },
    presetNameActive: {
      color: c.textOnPrimary
    },
    presetPattern: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '500' as const
    },
    presetPatternActive: {
      color: c.textOnPrimary,
      opacity: 0.8
    },
    supportSection: {
      gap: 14,
      paddingTop: 8
    },
    supportText: {
      color: c.textFaint,
      fontSize: 13,
      lineHeight: 19
    },
    supportButton: {
      alignSelf: 'flex-start',
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border
    },
    supportButtonText: {
      color: c.textMuted,
      fontSize: 13,
      fontWeight: '500'
    }
  })
}
