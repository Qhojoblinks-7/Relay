// src/screens/auth/GetStartedScreen.js
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { globalStyles } from "../../constants/globalStyles";

export default function GetStartedScreen() {
  const navigation = useNavigation();

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Get Started</Text>

      <TouchableOpacity
        style={globalStyles.primaryButton}
        onPress={() => navigation.navigate("JoinCrew")}
      >
        <Text style={globalStyles.primaryButtonText}>Join a Crew</Text>
      </TouchableOpacity>

      <Text style={globalStyles.subtitle}>Use the link from your admin</Text>

      <TouchableOpacity
        style={globalStyles.secondaryButton}
        onPress={() => navigation.navigate("CreateAccount")}
      >
        <Text style={globalStyles.secondaryButtonText}>
          Create your own Crew
        </Text>
      </TouchableOpacity>
    </View>
  );
}
