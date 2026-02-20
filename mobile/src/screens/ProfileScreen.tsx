import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, SafeAreaView, Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../store';

const MenuItem = ({ icon, label, color = '#AAA', rightLabel }: any) => (
    <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuLeft}>
            <Icon name={icon} size={22} color={color} />
            <Text style={styles.menuLabel}>{label}</Text>
        </View>
        <View style={styles.menuRight}>
            {rightLabel && <Text style={styles.rightLabel}>{rightLabel}</Text>}
            <Icon name="chevron-right" size={20} color="#333" />
        </View>
    </TouchableOpacity>
);

export default function ProfileScreen({ navigation }: any) {
    const { user, logout } = useAuthStore();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Icon name="qrcode-scan" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Icon name="magnify" size={22} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Profile Hub */}
                <View style={styles.profileHub}>
                    <View style={styles.statusBubble}>
                        <Text style={styles.statusText}>Best thing about time is, it changes 😇</Text>
                        <View style={styles.bubbleTail} />
                    </View>

                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Icon name="account" size={60} color="#6C5CE7" />
                        </View>
                        <TouchableOpacity style={styles.addAvatarBtn}>
                            <Icon name="camera" size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.userName}>{user?.name || 'Sanjana Bathula'}</Text>
                </View>

                {/* Group 1 */}
                <View style={styles.menuGroup}>
                    <MenuItem icon="face-man-profile" label="Avatar" color="#A29BFE" />
                    <MenuItem icon="format-list-bulleted" label="Lists" color="#74B9FF" />
                    <MenuItem icon="bullhorn-outline" label="Broadcast messages" color="#81ECEC" />
                    <MenuItem icon="star-outline" label="Starred" color="#FAB1A0" />
                    <MenuItem icon="laptop" label="Linked devices" color="#55E6C1" />
                </View>

                {/* Group 2 */}
                <View style={styles.menuGroup}>
                    <MenuItem icon="key-variant" label="Account" color="#6C5CE7" />
                    <MenuItem icon="lock-outline" label="Privacy" color="#00CEC9" />
                    <MenuItem icon="chat-outline" label="Chats" color="#00B894" />
                    <MenuItem icon="bell-outline" label="Notifications" color="#FF7675" />
                </View>

                {/* Group 3 (App Specific) */}
                <View style={styles.menuGroup}>
                    <MenuItem icon="robot" label="AI Assistant Preferences" color="#6C5CE7" />
                    <MenuItem icon="help-circle-outline" label="Help" color="#AAA" />
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>

                <Text style={styles.footer}>from {'\n'} <Text style={styles.metaText}>ANTIGRAVITY</Text></Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070712' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    headerRight: { flexDirection: 'row', gap: 20 },
    headerIcon: { width: 30, alignItems: 'center' },
    scrollContent: { paddingBottom: 60 },
    profileHub: { alignItems: 'center', marginTop: 10, marginBottom: 30 },
    statusBubble: {
        backgroundColor: '#1E1E35',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginBottom: 20,
        maxWidth: '80%',
    },
    statusText: { color: '#FFF', fontSize: 13, fontWeight: '500' },
    bubbleTail: {
        position: 'absolute',
        bottom: -6,
        left: '50%',
        marginLeft: -6,
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#1E1E35',
    },
    avatarContainer: { marginBottom: 15 },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#16162A',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2A2A40',
    },
    addAvatarBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#6C5CE7',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#070712',
    },
    userName: { fontSize: 24, fontWeight: '800', color: '#FFF' },
    menuGroup: {
        backgroundColor: '#121225',
        marginHorizontal: 16,
        borderRadius: 20,
        marginBottom: 20,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1E1E35',
    },
    menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    menuLabel: { color: '#FFF', fontSize: 15, fontWeight: '500' },
    menuRight: { flexDirection: 'row', alignItems: 'center' },
    rightLabel: { color: '#666', fontSize: 13, marginRight: 5 },
    logoutBtn: {
        marginTop: 10,
        marginHorizontal: 16,
        backgroundColor: '#1A1A35',
        paddingVertical: 15,
        borderRadius: 16,
        alignItems: 'center',
    },
    logoutText: { color: '#FF7675', fontWeight: '700', fontSize: 15 },
    footer: {
        textAlign: 'center',
        color: '#333',
        fontSize: 10,
        marginTop: 40,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    metaText: { color: '#6C5CE7', fontWeight: '800', fontSize: 12 },
});
