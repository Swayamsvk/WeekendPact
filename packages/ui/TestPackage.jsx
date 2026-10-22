import React from "react";
import { View, Text, StyleSheet } from "react-native";

const CheckoutScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello Checkout</Text>
    </View>
  );
};

export default CheckoutScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
  },
});
