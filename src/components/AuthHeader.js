// src/components/AuthHeader.js
import { Image } from "react-native";
import logo from "../assets/logo.png";

export default function AuthHeader() {
  return (
    <Image
      source={logo}
      style={{ width: 200, height: 200, marginBottom: 22, alignSelf: "center" }}
      resizeMode="contain"
    />
  );
}
