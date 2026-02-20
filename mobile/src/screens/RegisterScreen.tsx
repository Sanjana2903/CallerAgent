import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { useAuthStore } from '../store';

export default function RegisterScreen({ navigation }: any) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuthStore();

    const handleRegister = async () => {
        if (!name.trim() || !email.trim() || !password.trim()) {
            Alert.alert('Error', 'Name, email and password are required');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }
        setIsLoading(true);
        try {
            await register(name.trim(), email.trim().toLowerCase(), password, phone.trim() || undefined);
        } catch (err: any) {
            Alert.alert('Registration Failed', err.response?.data?.error || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <StatusBar barStyle="light-content" backgroundColor="#0D0D1A" />
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.logo}>📞 Ringia</Text>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Set up your AI call assistant in minutes</Text>
                </View>

                <View style={styles.form}>
                    {[
                        { label: 'Full Name', value: name, setter: setName, placeholder: 'John Smith', type: 'default' },
                        { label: 'Email', value: email, setter: setEmail, placeholder: 'you@example.com', type: 'email-address' },
                        { label: 'Password (min 6 chars)', value: password, setter: setPassword, placeholder: '••••••••', secure: true },
                        { label: 'Phone Number (optional, for call takeover)', value: phone, setter: setPhone, placeholder: '+91 98765 43210', type: 'phone-pad' },
                    ].map((field, i) => (
                        <View key={i} style={styles.inputGroup}>
                            <Text style={styles.label}>{field.label}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={field.placeholder}
                                placeholderTextColor="#555"
                                value={field.value}
                                onChangeText={field.setter}
                                keyboardType={(field.type || 'default') as any}
                                secureTextEntry={field.secure}
                                autoCapitalize={field.type === 'email-address' ? 'none' : 'words'}
                            />
                        </View>
                    ))}

                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            💡 After registering, you'll get a unique PIN. Use it to set up call forwarding on your phone.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={isLoading}
                    >
                        {isLoading
                            ? <ActivityIndicator color="#FFF" />
                            : <Text style={styles.buttonText}>Create Account</Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
                        <Text style={styles.linkText}>Already have an account? </Text>
                        <Text style={styles.linkHighlight}>Sign in</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D0D1A' },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 32 },
    logo: { fontSize: 28, fontWeight: '800', color: '#FFF', marginBottom: 16 },
    title: { fontSize: 26, fontWeight: '700', color: '#FFF', marginBottom: 6 },
    subtitle: { fontSize: 14, color: '#888', textAlign: 'center' },
    form: { backgroundColor: '#16162A', borderRadius: 20, padding: 24 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, color: '#888', marginBottom: 6, fontWeight: '600' },
    input: {
        backgroundColor: '#0D0D1A', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 15, color: '#FFF', borderWidth: 1, borderColor: '#2A2A40',
    },
    infoBox: { backgroundColor: '#1A1A30', borderRadius: 12, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#6C5CE7' },
    infoText: { color: '#999', fontSize: 13, lineHeight: 20 },
    button: { backgroundColor: '#6C5CE7', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
    linkText: { color: '#888', fontSize: 14 },
    linkHighlight: { color: '#6C5CE7', fontSize: 14, fontWeight: '600' },
});
