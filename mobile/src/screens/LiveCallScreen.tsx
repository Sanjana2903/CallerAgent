import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, FlatList,
    Alert, Animated, Vibration, StatusBar, SafeAreaView,
} from 'react-native';
import { useCallStore, useAuthStore } from '../store';
import socketService from '../services/socketService';
import { callsAPI } from '../services/api';
import { INTENT_CONFIG } from '../utils/constants';

interface TranscriptItem {
    role: string;
    content: string;
    timestamp: Date;
    isPartial?: boolean;
    key: string;
}

export default function LiveCallScreen({ navigation }: any) {
    const { activeCall, updateActiveCall, addTranscriptEntry, clearActiveCall } = useCallStore();
    const { user } = useAuthStore();
    const flatListRef = useRef<FlatList>(null);
    const [isTakingOver, setIsTakingOver] = useState(false);
    const [localTranscript, setLocalTranscript] = useState<TranscriptItem[]>([]);

    // Pulsing animation for AI speaking indicator
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const urgentAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!activeCall) return;

        // Setup Socket.io listeners for live transcript
        const handleTranscriptEntry = (data: any) => {
            if (data.callId !== activeCall.callId) return;
            const entry: TranscriptItem = {
                role: data.role,
                content: data.content,
                timestamp: new Date(data.timestamp || Date.now()),
                key: `${Date.now()}-${Math.random()}`,
            };
            setLocalTranscript(prev => [...prev, entry]);
            // Auto-scroll
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        };

        const handleIntentDetected = (data: any) => {
            if (data.callId !== activeCall.callId) return;
            updateActiveCall({ intent: data.intent, intentLabel: data.intentLabel });
        };

        const handleCallUrgent = (data: any) => {
            if (data.callId !== activeCall.callId) return;
            updateActiveCall({ isUrgent: true });
            Vibration.vibrate([0, 500, 200, 500]);
            startUrgentAnimation();
        };

        const handleCallEnded = (data: any) => {
            if (data.callSid !== activeCall.callSid) return;
            clearActiveCall();
            navigation.goBack();
        };

        socketService.on('transcript_entry', handleTranscriptEntry);
        socketService.on('intent_detected', handleIntentDetected);
        socketService.on('call_urgent', handleCallUrgent);
        socketService.on('call_ended', handleCallEnded);

        // Pulse animation loop
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        );
        pulseAnimation.start();

        return () => {
            socketService.off('transcript_entry', handleTranscriptEntry);
            socketService.off('intent_detected', handleIntentDetected);
            socketService.off('call_urgent', handleCallUrgent);
            socketService.off('call_ended', handleCallEnded);
            pulseAnimation.stop();
        };
    }, [activeCall]);

    const startUrgentAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(urgentAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
                Animated.timing(urgentAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
            ]), { iterations: 6 }
        ).start();
    };

    const handleTakeover = async () => {
        if (!activeCall) return;
        Alert.alert(
            'Take Over Call',
            "You'll be dialed on your registered phone number and added to the call. AI will step aside.",
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Take Over',
                    onPress: async () => {
                        setIsTakingOver(true);
                        try {
                            await callsAPI.takeover(activeCall.callId);
                            Alert.alert('✅ Taking Over', 'Your phone will ring shortly. AI is stepping aside.');
                        } catch (err: any) {
                            Alert.alert('Error', err.response?.data?.error || 'Failed to take over call');
                        } finally {
                            setIsTakingOver(false);
                        }
                    }
                }
            ]
        );
    };

    const handleEndCall = async () => {
        if (!activeCall) return;
        Alert.alert(
            'End Call',
            'End this call? The AI will disconnect.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'End Call',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await callsAPI.endCall(activeCall.callId);
                            clearActiveCall();
                            navigation.goBack();
                        } catch (err: any) {
                            Alert.alert('Error', 'Failed to end call');
                        }
                    }
                }
            ]
        );
    };

    const handleMuteAI = async () => {
        if (!activeCall) return;
        try {
            await callsAPI.muteAI(activeCall.callId);
            Alert.alert('✅ AI Muted', 'The AI will no longer speak or listen to this call.');
        } catch (err: any) {
            Alert.alert('Error', 'Failed to mute AI');
        }
    };

    const renderTranscriptItem = ({ item }: { item: TranscriptItem }) => {
        const isAI = item.role === 'ai';
        const isCaller = item.role === 'caller';

        return (
            <View style={[styles.transcriptBubble, isAI ? styles.aiBubble : styles.callerBubble]}>
                <View style={styles.bubbleHeader}>
                    <Text style={[styles.bubbleRole, isAI ? styles.aiRole : styles.callerRole]}>
                        {isAI ? '🤖 AI' : '📱 Caller'}
                    </Text>
                    <Text style={styles.bubbleTime}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                <Text style={styles.bubbleText}>{item.content}</Text>
            </View>
        );
    };

    if (!activeCall) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.noCallContainer}>
                    <Text style={styles.noCallIcon}>📵</Text>
                    <Text style={styles.noCallText}>No active call</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const intentConfig = INTENT_CONFIG[activeCall.intent || ''];

    return (
        <SafeAreaView style={[styles.container, activeCall.isUrgent && styles.urgentContainer]}>
            <StatusBar barStyle="light-content" backgroundColor={activeCall.isUrgent ? '#D63031' : '#0D0D1A'} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.callerInfo}>
                    <Animated.View style={[styles.aiIndicator, { transform: [{ scale: pulseAnim }] }]}>
                        <Text style={styles.aiIndicatorEmoji}>🤖</Text>
                    </Animated.View>
                    <View>
                        <Text style={styles.callerName}>{activeCall.callerName || activeCall.callerNumber}</Text>
                        {activeCall.callerName && (
                            <Text style={styles.callerNumber}>{activeCall.callerNumber}</Text>
                        )}
                        <Text style={styles.aiHandlingText}>AI is handling this call</Text>
                    </View>
                </View>

                {/* Intent badge */}
                {intentConfig && (
                    <View style={[styles.intentBadge, { backgroundColor: intentConfig.color + '33' }]}>
                        <Text style={styles.intentEmoji}>{intentConfig.emoji}</Text>
                        <Text style={[styles.intentLabel, { color: intentConfig.color }]}>{intentConfig.label}</Text>
                    </View>
                )}
            </View>

            {/* Urgent alert */}
            {activeCall.isUrgent && (
                <Animated.View style={[styles.urgentBanner, { opacity: urgentAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }]}>
                    <Text style={styles.urgentText}>🚨 URGENT — Tap Take Over immediately!</Text>
                </Animated.View>
            )}

            {/* Live Transcript */}
            <View style={styles.transcriptContainer}>
                <View style={styles.transcriptHeader}>
                    <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE TRANSCRIPT</Text>
                    </View>
                    <Text style={styles.transcriptCount}>{localTranscript.length} messages</Text>
                </View>

                {localTranscript.length === 0 ? (
                    <View style={styles.waitingContainer}>
                        <Text style={styles.waitingText}>⏳ Waiting for call to start...</Text>
                        <Text style={styles.waitingSubtext}>Transcript will appear here as the AI speaks</Text>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={localTranscript}
                        keyExtractor={(item) => item.key}
                        renderItem={renderTranscriptItem}
                        style={styles.transcriptList}
                        contentContainerStyle={{ paddingBottom: 16 }}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionBar}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.endButton]}
                    onPress={handleEndCall}
                >
                    <Text style={styles.actionButtonIcon}>📴</Text>
                    <Text style={styles.endButtonText}>End</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.muteButton]}
                    onPress={handleMuteAI}
                >
                    <Text style={styles.actionButtonIcon}>🔇</Text>
                    <Text style={styles.muteButtonText}>Mute AI</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.takeoverButton, isTakingOver && styles.buttonDisabled]}
                    onPress={handleTakeover}
                    disabled={isTakingOver}
                >
                    <Text style={styles.actionButtonIcon}>📞</Text>
                    <Text style={styles.takeoverButtonText}>
                        {isTakingOver ? '...' : 'Takeover'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070712' },
    urgentContainer: { backgroundColor: '#1A0000' },
    header: { padding: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1E1E35' },
    callerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    aiIndicator: {
        width: 60, height: 60, borderRadius: 20,
        backgroundColor: '#6C5CE715',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 16, borderWidth: 1, borderColor: '#6C5CE7',
        shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    },
    aiIndicatorEmoji: { fontSize: 32 },
    callerName: { fontSize: 24, fontWeight: '800', color: '#FFF' },
    callerNumber: { fontSize: 14, color: '#666', marginTop: 4, letterSpacing: 1 },
    aiHandlingText: { fontSize: 11, color: '#6C5CE7', marginTop: 6, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    intentBadge: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, gap: 8,
        backgroundColor: '#16162A', borderWidth: 1, borderColor: '#1E1E35'
    },
    intentEmoji: { fontSize: 18 },
    intentLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    urgentBanner: {
        backgroundColor: '#D63031', paddingVertical: 14, paddingHorizontal: 24,
        alignItems: 'center',
    },
    urgentText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
    transcriptContainer: { flex: 1, padding: 20 },
    transcriptHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 20,
    },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    liveDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: '#00CEC9',
        shadowColor: '#00CEC9', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
    },
    liveText: { color: '#00CEC9', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    transcriptCount: { color: '#444', fontSize: 11, fontWeight: '700' },
    transcriptList: { flex: 1 },
    waitingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    waitingText: { color: '#666', fontSize: 18, fontWeight: '700', marginBottom: 12 },
    waitingSubtext: { color: '#444', fontSize: 14, textAlign: 'center', lineHeight: 20 },
    transcriptBubble: {
        marginBottom: 20, maxWidth: '88%', borderRadius: 20, padding: 16,
    },
    aiBubble: { alignSelf: 'flex-start', backgroundColor: '#121225', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#1E1E35' },
    callerBubble: { alignSelf: 'flex-end', backgroundColor: '#6C5CE7', borderBottomRightRadius: 4 },
    bubbleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    bubbleRole: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    aiRole: { color: '#6C5CE7' },
    callerRole: { color: '#00CEC9' },
    bubbleTime: { fontSize: 10, color: '#444' },
    bubbleText: { color: '#EEE', fontSize: 15, lineHeight: 23, fontWeight: '500' },
    actionBar: {
        flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 24,
        gap: 12, borderTopWidth: 1, borderTopColor: '#1E1E35', backgroundColor: '#070712'
    },
    actionButton: {
        flex: 1, borderRadius: 20, paddingVertical: 18,
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8,
    },
    endButton: { backgroundColor: '#2D1010', borderWidth: 1, borderColor: '#D63031' },
    takeoverButton: { backgroundColor: '#6C5CE7', shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12 },
    muteButton: { backgroundColor: '#16162A', borderWidth: 1, borderColor: '#1E1E35' },
    buttonDisabled: { opacity: 0.5 },
    actionButtonIcon: { fontSize: 20 },
    endButtonText: { color: '#D63031', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
    muteButtonText: { color: '#666', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
    takeoverButtonText: { color: '#FFF', fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
    noCallContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    noCallIcon: { fontSize: 64, marginBottom: 20 },
    noCallText: { color: '#666', fontSize: 20, fontWeight: '700' },
    backButton: { marginTop: 32, backgroundColor: '#6C5CE7', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 20 },
    backButtonText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
