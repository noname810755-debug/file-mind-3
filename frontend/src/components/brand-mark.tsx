import React from "react";
import { View } from "react-native";

import { Icon } from "@/src/icons";
import { makeStyles, radius } from "@/src/theme";

export function BrandMark({ size = 42 }: { size?: number }) {
  const styles = useStyles();
  const symbol = Math.max(16, Math.round(size * 0.52));
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: Math.round(size * radius.md / 12) }]}>
      <Icon name="file-document-outline" size={symbol} color="#FFFFFF" />
      <View style={[styles.mind, { width: Math.max(10, size * 0.28), height: Math.max(10, size * 0.28), borderRadius: size }]}>
        <Icon name="brain" size={Math.max(9, Math.round(size * 0.2))} color="#FF5E00" />
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  box: {
    backgroundColor: "#FF5E00",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  mind: {
    position: "absolute",
    right: 2,
    bottom: 2,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
}));
