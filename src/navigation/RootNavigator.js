// src/navigation/RootNavigator.js
import React from "react";
import { useAuth } from "../context/AuthContext";
import AuthStack from "./AuthStack";
import MainStack from "./MainStack";

export default function RootNavigator() {
  const { isAuthenticated } = useAuth();

  // Once authenticated, mount the main app; otherwise show the auth flow.
  return isAuthenticated ? <MainStack /> : <AuthStack />;
}
