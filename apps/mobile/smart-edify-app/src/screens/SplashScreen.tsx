import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';

const SplashScreen = () => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000, // 3 segundos de duración
      useNativeDriver: false, // La animación de ancho no es compatible con el driver nativo
    }).start();
  }, [progressAnim]);

  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/logo.png')} style={styles.logo} />
      <Text style={styles.loadingText}>Loading...</Text>
      <View style={styles.progressBarContainer}>
        <Animated.View style={[styles.progressBar, { width: widthInterpolated }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#333',
  },
  progressBarContainer: {
    width: '60%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginTop: 20,
    overflow: 'hidden', // Asegura que la barra de progreso no se salga del contenedor
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007bff', // Color primario
  },
});

export default SplashScreen;
