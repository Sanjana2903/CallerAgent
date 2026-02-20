import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    ScrollView, StatusBar,
} from 'react-native';
import { useAuthStore } from '../store';
import { API_BASE_URL } from '../utils/constants';

export default function LoginScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuthStore();

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Please enter your email and password');
            return;
        }
        setIsLoading(true);
        try {
            await login(email.trim().toLowerCase(), password);
        } catch (err: any) {
            console.error('[Login] Error:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Invalid credentials';
            Alert.alert('Login Failed', `${errorMsg}\n\nURL: ${API_BASE_URL}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <StatusBar barStyle="light-content" backgroundColor="#0D0D1A" />
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <Text style={styles.logoIcon}>📞</Text>
                    <Text style={styles.title}>Welcome to Vexa</Text>
                    <Text style={styles.tagline}>Your AI Call Assistant</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <Text style={styles.welcomeText}>Welcome back</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="you@example.com"
                            placeholderTextColor="#555"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#555"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading
                            ? <ActivityIndicator color="#FFF" />
                            : <Text style={styles.buttonText}>Sign In</Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkRow}>
                        <Text style={styles.linkText}>Don't have an account? </Text>
                        <Text style={styles.linkHighlight}>Sign up</Text>
                    </TouchableOpacity>
                </View>

                {/* Feature bullets */}
                <View style={styles.features}>
                    {['🤖 AI answers calls when you\'re busy', '📝 Live transcripts & summaries', '🚫 Blocks spam automatically', '📞 One tap to join any call'].map((f, i) => (
                        <Text key={i} style={styles.featureText}>{f}</Text>
                    ))}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D0D1A' },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
    logoContainer: { alignItems: 'center', marginBottom: 40 },
    logoIcon: { fontSize: 56, marginBottom: 8 },
    logoText: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
    tagline: { fontSize: 14, color: '#888', marginTop: 4 },
    form: { backgroundColor: '#16162A', borderRadius: 20, padding: 24, marginBottom: 24 },
    welcomeText: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 24 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, color: '#888', marginBottom: 6, fontWeight: '600' },
    input: {
        backgroundColor: '#0D0D1A',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#FFF',
        borderWidth: 1,
        borderColor: '#2A2A40',
    },
    button: {
        backgroundColor: '#6C5CE7',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
    linkText: { color: '#888', fontSize: 14 },
    linkHighlight: { color: '#6C5CE7', fontSize: 14, fontWeight: '600' },
    features: { gap: 8 },
    featureText: { color: '#666', fontSize: 13, textAlign: 'center' },
});
