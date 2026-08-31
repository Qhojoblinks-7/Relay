// src/screens/auth/GetStartedScreen.js
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { globalStyles } from "../../constants/globalStyles";
import { COLORS } from "../../constants/theme";
import AuthHeader from "../../components/AuthHeader";
import AuthBackground from "../../components/AuthBackground";

export default function GetStartedScreen() {
  const navigation = useNavigation();

  return (
    <View style={globalStyles.container}>
      <AuthBackground />
      <AuthHeader />
      <Text style={globalStyles.title}>Get Started</Text>

      <TouchableOpacity
        style={globalStyles.primaryButton}
        onPress={() => navigation.navigate("JoinCrew")}
      >
        <Text style={globalStyles.primaryButtonText}>Join a Crew</Text>
      </TouchableOpacity>

      <Text style={globalStyles.subtitle}>Use the link from your admin</Text>

      <View style={styles.orDivider}>
        <View style={styles.dividerLine} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={globalStyles.primaryButton}
        onPress={() => navigation.navigate("CreateAccount")}
      >
        <Text style={globalStyles.primaryButtonText}>
          Create your own Crew
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={globalStyles.primaryButton}
        onPress={() => navigation.navigate("SignIn")}
      >
        <Text style={globalStyles.primaryButtonText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    width: "85%",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.secondary,
  },
  orText: {
    color: COLORS.textMuted,
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: "600",
  },
});
