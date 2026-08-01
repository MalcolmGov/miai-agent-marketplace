import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

function buildChatUrl(): string {
  const base = (process.env.EXPO_PUBLIC_APP_CHAT_URL || "http://127.0.0.1:3000/app/v1").replace(
    /\/$/,
    "",
  );
  const key = process.env.EXPO_PUBLIC_EMBED_KEY || "";
  const title = process.env.EXPO_PUBLIC_APP_TITLE || "Assistant";
  const accent = process.env.EXPO_PUBLIC_APP_ACCENT || "#2bb8a8";
  const accent2 = process.env.EXPO_PUBLIC_APP_ACCENT2 || "#157f8d";

  // Allow full URL with query already present, or bare /app/v1 + env key.
  if (base.includes("key=")) return base;
  const u = new URL(base.includes("://") ? base : `http://${base}`);
  if (!u.pathname || u.pathname === "/") u.pathname = "/app/v1";
  if (key) u.searchParams.set("key", key);
  u.searchParams.set("title", title);
  u.searchParams.set("accent", accent);
  u.searchParams.set("accent2", accent2);
  return u.toString();
}

export default function App() {
  const uri = useMemo(() => buildChatUrl(), []);
  const hasKey = uri.includes("key=");

  if (!hasKey) {
    return (
      <SafeAreaProvider>
        <View style={styles.fallback}>
          <StatusBar style="light" />
          <Text style={styles.fallbackTitle}>Set EXPO_PUBLIC_EMBED_KEY</Text>
          <Text style={styles.fallbackBody}>
            Copy apps/mobile-shell/.env.example → .env and paste a live agent key from Studio →
            Install → App.
          </Text>
          <Text style={styles.fallbackMono}>{uri}</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <WebView
          source={{ uri }}
          style={styles.webview}
          originWhitelist={["*"]}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled
          bounces={false}
          overScrollMode="never"
          setSupportMultipleWindows={false}
          keyboardDisplayRequiresUserAction={false}
          hideKeyboardAccessoryView
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          scalesPageToFit={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator color="#2bb8a8" size="large" />
            </View>
          )}
          // Android soft keyboard
          {...(Platform.OS === "android" ? { nestedScrollEnabled: true } : {})}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0f16",
  },
  webview: {
    flex: 1,
    backgroundColor: "#0a0f16",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0f16",
  },
  fallback: {
    flex: 1,
    backgroundColor: "#0a0f16",
    padding: 28,
    justifyContent: "center",
    gap: 12,
  },
  fallbackTitle: {
    color: "#f2f6fb",
    fontSize: 20,
    fontWeight: "700",
  },
  fallbackBody: {
    color: "#8fa1b8",
    fontSize: 15,
    lineHeight: 22,
  },
  fallbackMono: {
    marginTop: 8,
    color: "#2bb8a8",
    fontSize: 12,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
});
