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
    container: { flex: 1, backgroundColor: '#0D0D1A' },
    urgentContainer: { backgroundColor: '#1A0000' },
    header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E1E35' },
    callerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    aiIndicator: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: '#6C5CE720',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 14, borderWidth: 2, borderColor: '#6C5CE7',
    },
    aiIndicatorEmoji: { fontSize: 24 },
    callerName: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    callerNumber: { fontSize: 13, color: '#888', marginTop: 2 },
    aiHandlingText: { fontSize: 12, color: '#6C5CE7', marginTop: 2, fontWeight: '600' },
    intentBadge: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6,
    },
    intentEmoji: { fontSize: 16 },
    intentLabel: { fontSize: 13, fontWeight: '600' },
    urgentBanner: {
        backgroundColor: '#D63031', paddingVertical: 12, paddingHorizontal: 20,
        alignItems: 'center',
    },
    urgentText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
    transcriptContainer: { flex: 1, padding: 16 },
    transcriptHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 12,
    },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    liveDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: '#00CEC9',
        // In real app, add blinking animation
    },
    liveText: { color: '#00CEC9', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    transcriptCount: { color: '#555', fontSize: 12 },
    transcriptList: { flex: 1 },
    waitingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    waitingText: { color: '#888', fontSize: 16, marginBottom: 8 },
    waitingSubtext: { color: '#555', fontSize: 13, textAlign: 'center' },
    transcriptBubble: {
        marginBottom: 12, maxWidth: '85%', borderRadius: 16, padding: 12,
    },
    aiBubble: { alignSelf: 'flex-start', backgroundColor: '#16162A', borderBottomLeftRadius: 4 },
    callerBubble: { alignSelf: 'flex-end', backgroundColor: '#1A1A35', borderBottomRightRadius: 4 },
    bubbleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    bubbleRole: { fontSize: 11, fontWeight: '700' },
    aiRole: { color: '#6C5CE7' },
    callerRole: { color: '#00CEC9' },
    bubbleTime: { fontSize: 10, color: '#555' },
    bubbleText: { color: '#E0E0E0', fontSize: 14, lineHeight: 22 },
    actionBar: {
        flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 16,
        gap: 8, borderTopWidth: 1, borderTopColor: '#1E1E35',
    },
    actionButton: {
        flex: 1, borderRadius: 14, paddingVertical: 12,
        alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4,
    },
    endButton: { backgroundColor: '#2D1010', borderWidth: 1, borderColor: '#D63031' },
    takeoverButton: { backgroundColor: '#6C5CE7' },
    muteButton: { backgroundColor: '#1A1A30', borderWidth: 1, borderColor: '#2A2A40' },
    buttonDisabled: { opacity: 0.5 },
    actionButtonIcon: { fontSize: 16 },
    endButtonText: { color: '#D63031', fontWeight: '700', fontSize: 13 },
    muteButtonText: { color: '#888', fontWeight: '700', fontSize: 13 },
    takeoverButtonText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    noCallContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    noCallIcon: { fontSize: 60, marginBottom: 16 },
    noCallText: { color: '#888', fontSize: 18 },
    backButton: { marginTop: 24, backgroundColor: '#6C5CE7', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
    backButtonText: { color: '#FFF', fontWeight: '700' },
});
