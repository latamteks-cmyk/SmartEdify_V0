import React from 'react';
import { View, Text, Button, StyleSheet, Image } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const DashboardScreen = () => {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          style={styles.avatar}
          source={{ uri: 'https://www.gravatar.com/avatar/?d=mp' }} // Placeholder avatar
        />
        <Text style={styles.username}>{user?.name}</Text>
      </View>
      <Text style={styles.title}>Dashboard</Text>
      {/* Aquí irá el resto del contenido del dashboard */}
      <Button title="Logout" onPress={logout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default DashboardScreen;
