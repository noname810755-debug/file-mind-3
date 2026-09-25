import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import React from "react";

type IconName = React.ComponentProps<typeof MaterialDesignIcons>["name"];

export function Icon({
  name,
  size = 24,
  color,
}: {
  name: IconName;
  size?: number;
  color: string;
}) {
  return <MaterialDesignIcons name={name} size={size} color={color} />;
}

export type { IconName };
export const iconFont = MaterialDesignIcons.font;
