import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Header from '../components/Header';
import BottomTabBar from '../components/BottomTabBar';

const DashboardScreen = () => {
    return (
        <View style={styles.container}>
            <Header />
            <View style={styles.content}>
                <Text style={styles.title}>Propuesta 1</Text>
                {/* Add other dashboard content here */}
            </View>
            <BottomTabBar />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f8fa',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
});

export default DashboardScreen;
