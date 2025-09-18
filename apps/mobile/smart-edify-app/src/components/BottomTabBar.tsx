import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const BottomTabBar = () => {
    return (
        <View style={styles.tabBar}>
            <TouchableOpacity style={styles.tabItem}>
                <Text style={styles.tabText}>Voting</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem}>
                <Text style={styles.tabText}>Results</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem}>
                 <Text style={styles.tabText}>Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem}>
                <Text style={styles.tabText}>Settings</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#0d1b2a',
        paddingVertical: 15,
    },
    tabItem: {
        alignItems: 'center',
    },
    tabText: {
        color: 'white',
        fontSize: 16,
    },
});

export default BottomTabBar;
