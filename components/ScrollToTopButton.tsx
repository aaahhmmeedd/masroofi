import React, { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemeColors } from "@/constants/colors";
import * as Haptics from "expo-haptics";

interface ScrollToTopButtonProps {
  scrollViewRef: React.RefObject<any>;
  colors: ThemeColors;
}

export function useScrollToTop(colors: ThemeColors) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [shouldShow, setShouldShow] = useState(false);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const show = offsetY > 300;

    if (show && !shouldShow) {
      setShouldShow(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (!show && shouldShow) {
      setShouldShow(false);
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  return { opacity, shouldShow, handleScroll };
}

export function ScrollToTopButton({
  scrollViewRef,
  colors: C,
  opacity,
  shouldShow,
}: ScrollToTopButtonProps & { opacity: Animated.Value; shouldShow: boolean }) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          pointerEvents: shouldShow ? "auto" : "none",
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={[
          styles.button,
          {
            backgroundColor: C.navy,
            shadowColor: C.shadow,
          },
        ]}
      >
        <Feather name="arrow-up" size={20} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 140,
    right: 20,
    zIndex: 10,
  },
  button: {
    width: 52,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
});
