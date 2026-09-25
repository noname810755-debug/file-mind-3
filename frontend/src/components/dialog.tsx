import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/src/icons";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export type ActionOption = {
  label: string;
  icon?: IconName;
  value: string;
  destructive?: boolean;
  disabled?: boolean;
};

type ConfirmOpts = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};
type PromptOpts = {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
};
type ActionsOpts = { title?: string; options: ActionOption[] };

type DialogCtx = {
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  prompt: (o: PromptOpts) => Promise<string | null>;
  actions: (o: ActionsOpts) => Promise<string | null>;
};

const Ctx = createContext<DialogCtx>({
  confirm: async () => false,
  prompt: async () => null,
  actions: async () => null,
});
export const useDialog = () => useContext(Ctx);

type State =
  | { kind: "confirm"; opts: ConfirmOpts }
  | { kind: "prompt"; opts: PromptOpts }
  | { kind: "actions"; opts: ActionsOpts }
  | null;

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<State>(null);
  const [text, setText] = useState("");
  const resolver = useRef<((v: any) => void) | null>(null);

  const close = useCallback((value: any) => {
    const r = resolver.current;
    resolver.current = null;
    setState(null);
    r?.(value);
  }, []);

  const confirm = useCallback((opts: ConfirmOpts) => {
    setState({ kind: "confirm", opts });
    return new Promise<boolean>((res) => (resolver.current = res));
  }, []);
  const prompt = useCallback((opts: PromptOpts) => {
    setText(opts.defaultValue ?? "");
    setState({ kind: "prompt", opts });
    return new Promise<string | null>((res) => (resolver.current = res));
  }, []);
  const actions = useCallback((opts: ActionsOpts) => {
    setState({ kind: "actions", opts });
    return new Promise<string | null>((res) => (resolver.current = res));
  }, []);

  const isSheet = state?.kind === "actions";

  return (
    <Ctx.Provider value={{ confirm, prompt, actions }}>
      {children}
      <Modal visible={!!state} transparent animationType="fade" onRequestClose={() => close(state?.kind === "actions" ? null : false)}>
        <Pressable
          style={[styles.backdrop, isSheet && styles.backdropSheet]}
          onPress={() => close(state?.kind === "prompt" ? null : state?.kind === "actions" ? null : false)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.kav}>
            <Pressable onPress={() => {}} style={isSheet ? [styles.sheet, { paddingBottom: insets.bottom + spacing.md }] : styles.dialog}>
              {state?.kind === "confirm" && (
                <>
                  <Text style={styles.title}>{state.opts.title}</Text>
                  {!!state.opts.message && <Text style={styles.message}>{state.opts.message}</Text>}
                  <View style={styles.btnRow}>
                    <Pressable testID="dialog-cancel" style={[styles.btn, styles.btnGhost]} onPress={() => close(false)}>
                      <Text style={styles.btnGhostText}>{state.opts.cancelText || "Cancel"}</Text>
                    </Pressable>
                    <Pressable
                      testID="dialog-confirm"
                      style={[styles.btn, state.opts.destructive ? styles.btnDanger : styles.btnPrimary]}
                      onPress={() => close(true)}
                    >
                      <Text style={styles.btnPrimaryText}>{state.opts.confirmText || "Confirm"}</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {state?.kind === "prompt" && (
                <>
                  <Text style={styles.title}>{state.opts.title}</Text>
                  {!!state.opts.message && <Text style={styles.message}>{state.opts.message}</Text>}
                  <TextInput
                    testID="dialog-input"
                    style={styles.input}
                    value={text}
                    onChangeText={setText}
                    placeholder={state.opts.placeholder}
                    placeholderTextColor={colors.muted}
                    autoFocus
                    selectTextOnFocus
                    onSubmitEditing={() => text.trim() && close(text.trim())}
                  />
                  <View style={styles.btnRow}>
                    <Pressable testID="dialog-cancel" style={[styles.btn, styles.btnGhost]} onPress={() => close(null)}>
                      <Text style={styles.btnGhostText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      testID="dialog-confirm"
                      style={[styles.btn, styles.btnPrimary, !text.trim() && styles.btnDisabled]}
                      disabled={!text.trim()}
                      onPress={() => close(text.trim())}
                    >
                      <Text style={styles.btnPrimaryText}>{state.opts.confirmText || "OK"}</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {state?.kind === "actions" && (
                <>
                  <View style={styles.grabber} />
                  {!!state.opts.title && <Text style={styles.sheetTitle}>{state.opts.title}</Text>}
                  <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                    {state.opts.options.map((o) => (
                      <Pressable
                        key={o.value}
                        testID={`action-${o.value}`}
                        disabled={o.disabled}
                        style={[styles.action, o.disabled && styles.actionDisabled]}
                        onPress={() => close(o.value)}
                      >
                        {o.icon && (
                          <Icon
                            name={o.icon}
                            size={22}
                            color={o.destructive ? colors.error : colors.onSurface}
                          />
                        )}
                        <Text style={[styles.actionText, o.destructive && { color: colors.error }]}>
                          {o.label}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </Ctx.Provider>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "center", padding: spacing.xl },
  backdropSheet: { justifyContent: "flex-end", padding: 0 },
  kav: { width: "100%", alignItems: "center" },
  dialog: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignSelf: "center",
  },
  sheet: {
    width: "100%",
    backgroundColor: c.surfaceSecondary,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: spacing.md },
  title: { fontSize: 18, fontWeight: "700", color: c.onSurfaceSecondary },
  sheetTitle: { fontSize: 15, fontWeight: "700", color: c.muted, marginBottom: spacing.sm, paddingHorizontal: spacing.sm },
  message: { fontSize: 14, color: c.muted, marginTop: spacing.sm, lineHeight: 20 },
  input: {
    marginTop: spacing.lg,
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: c.onSurfaceTertiary,
    borderWidth: 1,
    borderColor: c.border,
  },
  btnRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
  btn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: "center" },
  btnGhost: { backgroundColor: c.surfaceTertiary },
  btnGhostText: { color: c.onSurfaceTertiary, fontWeight: "600", fontSize: 15 },
  btnPrimary: { backgroundColor: c.brandPrimary },
  btnDanger: { backgroundColor: c.error },
  btnPrimaryText: { color: c.onBrandPrimary, fontWeight: "700", fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  action: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  actionDisabled: { opacity: 0.4 },
  actionText: { fontSize: 16, color: c.onSurfaceSecondary, fontWeight: "500" },
}));
