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
                        activeOpacity={0.8}
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
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.pageTitle}>Settings</Text>

                {/* Profile Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Profile</Text>
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Display Name</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Your Name"
                                placeholderTextColor="#444"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={styles.readOnlyContainer}>
                                <Text style={styles.readOnlyText}>{user?.email}</Text>
                                <Text style={styles.lockedTag}>Verified</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* AI Personality */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>AI Assistant Personality</Text>
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Custom Greeting</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={greeting}
                                onChangeText={setGreeting}
                                placeholder="Hi, thanks for calling..."
                                placeholderTextColor="#444"
                                multiline
                                numberOfLines={3}
                            />
                            <Text style={styles.helperText}>Assistant will say this when picking up. Use {"{name}"} if needed.</Text>
                        </View>

                        <OptionSelector
                            label="Tone of Voice"
                            options={['professional', 'friendly', 'casual']}
                            current={tone}
                            onSelect={setTone}
                        />

                        <OptionSelector
                            label="Synthesizer Voice"
                            options={['shimmer', 'alloy', 'echo']}
                            current={voice}
                            onSelect={setVoice}
                        />
                    </View>
                </View>

                {/* Setup */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Setup & Forwarding</Text>
                    <View style={[styles.card, styles.setupCard]}>
                        <View style={styles.idRow}>
                            <View style={styles.idBox}>
                                <Text style={styles.idLabel}>TWILIO NUMBER</Text>
                                <Text style={styles.idValue}>{user?.twilioNumber || '+1 555-RINGIA'}</Text>
                            </View>
                            <View style={styles.idDivider} />
                            <View style={styles.idBox}>
                                <Text style={styles.idLabel}>YOUR PIN</Text>
                                <Text style={[styles.idValue, { color: '#00CEC9' }]}>{user?.userPin || '4922'}</Text>
                            </View>
                        </View>
                        <View style={styles.setupInfo}>
                            <Text style={styles.setupInstructions}>
                                Forward your mobile number to the Twilio number above.
                                The AI will ask for your PIN to identify your account.
                            </Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={isSaving}
                    activeOpacity={0.8}
                >
                    <Text style={styles.saveBtnText}>{isSaving ? 'Syncing...' : 'Save Preferences'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutBtnText}>Sign Out of Ringia</Text>
                </TouchableOpacity>

                <Text style={styles.footerVersion}>Ringia Cloud v1.0.2 Stable</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070712' },
    scrollContent: { padding: 24 },
    pageTitle: { fontSize: 32, fontWeight: '800', color: '#FFF', marginBottom: 32 },
    section: { marginBottom: 32 },
    sectionHeader: { fontSize: 13, fontWeight: '800', color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 },
    card: { backgroundColor: '#121225', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#1E1E35' },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 12, color: '#555', fontWeight: '700', marginBottom: 10, textTransform: 'uppercase' },
    input: {
        backgroundColor: '#070712', borderRadius: 16, padding: 16,
        color: '#FFF', fontSize: 15, borderWidth: 1, borderColor: '#1E1E35',
        fontWeight: '500'
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    readOnlyContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#16162A', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#1E1E35' },
    readOnlyText: { color: '#666', fontSize: 15, fontWeight: '500' },
    lockedTag: { fontSize: 10, color: '#00B894', fontWeight: '800', textTransform: 'uppercase', backgroundColor: '#00B89420', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    helperText: { color: '#444', fontSize: 11, marginTop: 8, lineHeight: 16 },
    optionGroup: { marginBottom: 20 },
    optionLabel: { fontSize: 12, color: '#555', fontWeight: '700', marginBottom: 12, textTransform: 'uppercase' },
    optionRow: { flexDirection: 'row', gap: 8 },
    optionItem: {
        flex: 1, paddingVertical: 14, alignItems: 'center',
        backgroundColor: '#070712', borderRadius: 16, borderWidth: 1, borderColor: '#1E1E35'
    },
    optionSelected: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
    optionText: { color: '#555', fontSize: 13, fontWeight: '700' },
    optionTextSelected: { color: '#FFF' },
    setupCard: { backgroundColor: '#1A1A35', borderColor: '#232345' },
    idRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8 },
    idBox: { alignItems: 'center' },
    idLabel: { color: '#6C5CE7', fontSize: 10, fontWeight: '800', marginBottom: 8 },
    idValue: { color: '#FFF', fontSize: 19, fontWeight: '800', letterSpacing: 0.5 },
    idDivider: { width: 1, height: 40, backgroundColor: '#232345' },
    setupInfo: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#232345' },
    setupInstructions: { color: '#777', fontSize: 13, textAlign: 'center', lineHeight: 20, fontWeight: '500' },
    saveBtn: { backgroundColor: '#6C5CE7', paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginTop: 10, shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15 },
    saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
    logoutBtn: { paddingVertical: 24, alignItems: 'center' },
    logoutBtnText: { color: '#FF7675', fontWeight: '800', fontSize: 14 },
    footerVersion: { color: '#333', fontSize: 11, textAlign: 'center', marginTop: 12, marginBottom: 40, fontWeight: '600' },
});
