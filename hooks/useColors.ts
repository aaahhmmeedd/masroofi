import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

export function useColors() {
  const scheme = useColorScheme();
  return scheme === "dark" ? colors.dark : colors.light;
}
