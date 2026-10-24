import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions, ActivityIndicator } from 'react-native';
import { Check, X, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/theme';

interface SwipeActionProps {
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function SwipeAction({ onConfirm, onCancel, isPending }: SwipeActionProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const knobWidth = 60;
  
  const threshold = (containerWidth / 2) - (knobWidth / 2) - 10; 

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isPending,
      onStartShouldSetPanResponderCapture: () => !isPending,
      onMoveShouldSetPanResponder: () => !isPending,
      onMoveShouldSetPanResponderCapture: () => !isPending,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (e, gestureState) => {
        if (isPending) return;
        let newX = gestureState.dx;
        // constrain to threshold
        if (newX > threshold) newX = threshold;
        if (newX < -threshold) newX = -threshold;
        pan.setValue({ x: newX, y: 0 });
      },
      onPanResponderRelease: (e, gestureState) => {
        if (isPending) return;
        if (gestureState.dx > threshold * 0.8) {
          // Trigger Confirm
          Animated.spring(pan, { toValue: { x: threshold, y: 0 }, useNativeDriver: false }).start(() => {
            onConfirm();
            setTimeout(() => pan.setValue({ x: 0, y: 0 }), 1000); // reset after a delay
          });
        } else if (gestureState.dx < -threshold * 0.8) {
          // Trigger Cancel
          Animated.spring(pan, { toValue: { x: -threshold, y: 0 }, useNativeDriver: false }).start(() => {
            onCancel();
            setTimeout(() => pan.setValue({ x: 0, y: 0 }), 1000);
          });
        } else {
          // Snap back
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  return (
    <View 
      style={styles.container} 
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Background Track */}
      <View style={styles.track}>
        {/* Left icon (Cancel) */}
        <View style={[styles.iconContainer, { left: 16 }]}>
          <X size={20} color={COLORS.error} />
          <Text style={[styles.bgText, { color: COLORS.error, marginLeft: 4 }]}>Cancel</Text>
        </View>

        {/* Right icon (Confirm) */}
        <View style={[styles.iconContainer, { right: 16 }]}>
          <Text style={[styles.bgText, { color: COLORS.completeBtnText, marginRight: 4 }]}>Confirm</Text>
          <Check size={20} color={COLORS.completeBtnText} />
        </View>
      </View>

      {/* Draggable Knob */}
      {containerWidth > 0 && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.knob,
            {
              transform: [{ translateX: pan.x }],
            },
          ]}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <View style={styles.knobInner}>
              <ChevronLeft size={16} color={COLORS.gray} />
              <View style={styles.knobGrip} />
              <ChevronRight size={16} color={COLORS.gray} />
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9', // light gray track
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center', // center the knob initially
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  track: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  bgText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  knob: {
    width: 60,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  knobInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobGrip: {
    width: 4,
    height: 16,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    marginHorizontal: 2,
  },
});
