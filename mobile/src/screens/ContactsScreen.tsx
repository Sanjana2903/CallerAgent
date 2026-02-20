import React, { useState } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity,
    SafeAreaView, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MOCK_CONTACTS = [
    { id: '1', name: 'Mom', phone: '+1 415-9988', category: 'Personal', status: 'VIP' },
    { id: '2', name: 'Domino\'s Pizza', phone: '+1 555-0199', category: 'Services', status: 'Auto-Handle' },
    { id: '3', name: 'Amazon Delivery', phone: '+1 800-4455', category: 'Logistics', status: 'Auto-Handle' },
    { id: '4', name: 'Work - Office', phone: '+1 650-8877', category: 'Work', status: 'Inform Busy' },
    { id: '5', name: 'Spam Risk', phone: '+1 888-2233', category: 'Spam', status: 'Blocked' },
];

export default function ContactsScreen() {
    const [search, setSearch] = useState('');

    const renderItem = ({ item }: any) => (
        <TouchableOpacity style={styles.contactCard} activeOpacity={0.7}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
            </View>
            <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactPhone}>{item.phone}</Text>
            </View>
            <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Contacts</Text>
                <TouchableOpacity style={styles.addBtn}>
                    <Icon name="plus" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <Icon name="magnify" size={20} color="#555" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search contacts..."
                    placeholderTextColor="#555"
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            <FlatList
                data={MOCK_CONTACTS}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070712' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        marginBottom: 20,
    },
    title: { fontSize: 32, fontWeight: '800', color: '#FFF' },
    addBtn: {
        backgroundColor: '#6C5CE7',
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#121225',
        marginHorizontal: 24,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1E1E35',
        marginBottom: 20,
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, height: 50, color: '#FFF', fontSize: 16 },
    list: { paddingHorizontal: 24, paddingBottom: 40 },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#121225',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1E1E35',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 16,
        backgroundColor: '#1E1E35',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: { color: '#6C5CE7', fontSize: 20, fontWeight: '800' },
    contactInfo: { flex: 1 },
    contactName: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
    contactPhone: { color: '#555', fontSize: 13, fontWeight: '500' },
    statusBadge: {
        backgroundColor: '#6C5CE720',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    statusText: { color: '#6C5CE7', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
});
