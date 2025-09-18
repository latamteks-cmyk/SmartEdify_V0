import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const Header = () => {
    return (
        <View style={styles.header}>
            <View style={styles.headerProfile}>
                <Image source={{ uri: 'https://via.placeholder.com/40' }} style={styles.profileImage} />
                <Text style={styles.profileName}>Melody Macy</Text>
            </View>
            <Text style={styles.userRole}>Propietario</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#ff7f00',
    },
    headerProfile: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    profileName: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    userRole: {
        color: 'white',
        fontSize: 16,
    },
});

export default Header;
