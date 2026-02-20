import React, { useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    TextInput, Switch, Alert, SafeAreaView,
} from 'react-native';
import { useAuthStore } from '../store';

export default function SettingsScreen() {
    const { user, updateUser, logout } = useAuthStore();
    const [name, setName] = useState(user?.name || '');
    const [greeting, setGreeting] = useState(user?.aiSettings?.greeting || '');
    const [tone, setTone] = useState(user?.aiSettings?.tone || 'professional');
    const [voice, setVoice] = useState(user?.aiSettings?.voice || 'shimmer');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateUser({
                name,
                aiSettings: {
                    ...user?.aiSettings,
                    greeting,
                    tone,
                    voice,
                }
            });
            Alert.alert('Success', 'Preferences updated successfully');
        } catch (err) {
            Alert.alert('Error', 'Failed to update preferences');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout }
        ]);
    };

    const OptionSelector = ({ label, options, current, onSelect }: any) => (
        <View style={styles.optionGroup}>
            <Text style={styles.optionLabel}>{label}</Text>
            <View style={styles.optionRow}>
                {options.map((opt: string) => (
                    <TouchableOpacity
                        key={opt}
                        style={[styles.optionItem, current === opt && styles.optionSelected]}
                        onPress={() => onSelect(opt)}
                    >
                        <Text style={[styles.optionText, current === opt && styles.optionTextSelected]}>
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Profile Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Profile</Text>
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Display Name</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Your Name"
                                placeholderTextColor="#555"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email (Read-only)</Text>
                            <Text style={styles.readOnlyText}>{user?.email}</Text>
                        </View>
                    </View>
                </View>

                {/* AI Personality */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>AI Personality</Text>
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Custom Greeting</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={greeting}
                                onChangeText={setGreeting}
                                placeholder="Hi, you've reached..."
                                placeholderTextColor="#555"
                                multiline
                                numberOfLines={3}
                            />
                            <Text style={styles.helperText}>Use {"{name}"} as a placeholder for your name.</Text>
                        </View>

                        <OptionSelector
                            label="Tone"
                            options={['professional', 'friendly', 'casual']}
                            current={tone}
                            onSelect={setTone}
                        />

                        <OptionSelector
                            label="Voice"
                            options={['shimmer', 'alloy', 'echo']}
                            current={voice}
                            onSelect={setVoice}
                        />
                    </View>
                </View>

                {/* AI Forwarding Numbers */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Forwarding Setup</Text>
                    <View style={styles.card}>
                        <View style={styles.idRow}>
                            <View>
                                <Text style={styles.idLabel}>Twilio Number</Text>
                                <Text style={styles.idValue}>{user?.twilioNumber || 'Pending Assignment'}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View>
                                <Text style={styles.idLabel}>Your PIN</Text>
                                <Text style={styles.idValue}>{user?.userPin || '----'}</Text>
                            </View>
                        </View>
                        <Text style={styles.setupInstructions}>
                            To use Ringia, forward your calls to the Shared AI Number and enter your unique PIN when prompted.
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save All Changes'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutBtnText}>Sign Out</Text>
                </TouchableOpacity>

                <Text style={styles.footerVersion}>Ringia v1.0.0 (POC)</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D0D1A' },
    scrollContent: { padding: 20 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 12 },
    card: { backgroundColor: '#16162A', borderRadius: 16, padding: 16 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 12, color: '#888', fontWeight: '800', marginBottom: 8, textTransform: 'uppercase' },
    input: {
        backgroundColor: '#0D0D1A', borderRadius: 10, padding: 12,
        color: '#FFF', fontSize: 15, borderWidth: 1, borderColor: '#2A2A40'
    },
    textArea: { height: 80, textAlignVertical: 'top' },
    readOnlyText: { color: '#666', fontSize: 15, paddingHorizontal: 4 },
    helperText: { color: '#555', fontSize: 11, marginTop: 4 },
    optionGroup: { marginBottom: 16 },
    optionLabel: { fontSize: 12, color: '#888', fontWeight: '800', marginBottom: 10 },
    optionRow: { flexDirection: 'row', gap: 8 },
    optionItem: {
        flex: 1, paddingVertical: 10, alignItems: 'center',
        backgroundColor: '#0D0D1A', borderRadius: 10, borderWidth: 1, borderColor: '#2A2A40'
    },
    optionSelected: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
    optionText: { color: '#888', fontSize: 13, fontWeight: '600' },
    optionTextSelected: { color: '#FFF' },
    idRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8 },
    idLabel: { color: '#888', fontSize: 11, textAlign: 'center', marginBottom: 4 },
    idValue: { color: '#6C5CE7', fontSize: 18, fontWeight: '800', textAlign: 'center' },
    divider: { width: 1, height: 30, backgroundColor: '#2A2A40' },
    setupInstructions: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18 },
    saveBtn: { backgroundColor: '#6C5CE7', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    logoutBtn: { paddingVertical: 20, alignItems: 'center' },
    logoutBtnText: { color: '#FF7675', fontWeight: '600' },
    footerVersion: { color: '#333', fontSize: 11, textAlign: 'center', marginTop: 10, marginBottom: 40 },
});
