import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Share, Alert, SafeAreaView,
} from 'react-native';
import { callsAPI } from '../services/api';
import { INTENT_CONFIG, SENTIMENT_COLORS } from '../utils/constants';

interface TranscriptEntry {
    role: string;
    content: string;
    timestamp: string;
}

export default function CallDetailScreen({ route, navigation }: any) {
    const { callId } = route.params;
    const [call, setCall] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadCallDetails();
    }, [callId]);

    const loadCallDetails = async () => {
        setIsLoading(true);
        try {
            const response = await callsAPI.getCall(callId);
            setCall(response.data.call);
        } catch (err: any) {
            Alert.alert('Error', 'Failed to load call details');
            navigation.goBack();
        } finally {
            setIsLoading(false);
        }
    };

    const handleShare = async () => {
        if (!call) return;
        try {
            await Share.share({
                message: `Call Summary: ${call.analysis?.summary}\n\nCaller: ${call.callerName || call.callerNumber}\nIntent: ${call.analysis?.intentLabel}`,
            });
        } catch (error) {
            console.error('Sharing failed', error);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Call',
            'Are you sure you want to delete this call from history?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await callsAPI.deleteCall(callId);
                            navigation.goBack();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete call');
                        }
                    }
                }
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator color="#6C5CE7" size="large" />
            </View>
        );
    }

    if (!call) return null;

    const intent = call.analysis?.intent || '';
    const config = INTENT_CONFIG[intent] || INTENT_CONFIG['personal.unknown'];
    const sentimentColor = SENTIMENT_COLORS[call.analysis?.sentiment || 'neutral'] || '#74B9FF';

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backEmoji}>←</Text>
                    </TouchableOpacity>
                    <View style={[styles.intentIcon, { backgroundColor: config.color + '15' }]}>
                        <Text style={styles.emoji}>{config.emoji}</Text>
                    </View>
                    <Text style={styles.callerName}>{call.callerName || call.callerNumber}</Text>
                    {call.callerName && <Text style={styles.callerNumber}>{call.callerNumber}</Text>}

                    <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: config.color + '25' }]}>
                            <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: sentimentColor + '25' }]}>
                            <Text style={[styles.badgeText, { color: sentimentColor }]}>
                                {call.analysis?.sentiment?.toUpperCase() || 'NEUTRAL'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* AI Summary Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Assistant Summary</Text>
                        <View style={styles.dot} />
                        <Text style={styles.durationText}>{Math.round(call.durationSeconds || 0)}s call</Text>
                    </View>
                    <Text style={styles.summaryText}>{call.analysis?.summary || 'The AI successfully handled this conversation.'}</Text>
                    {call.analysis?.actionTaken && (
                        <View style={styles.actionBox}>
                            <Text style={styles.actionLabel}>AUTOMATED ACTION:</Text>
                            <Text style={styles.actionText}>{call.analysis.actionTaken}</Text>
                        </View>
                    )}
                </View>

                {/* Transcript Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Conversation History</Text>
                    <View style={styles.transcriptContainer}>
                        {call.transcript && call.transcript.length > 0 ? (
                            call.transcript.map((entry: TranscriptEntry, index: number) => (
                                <View key={index} style={[
                                    styles.bubbleWrapper,
                                    entry.role === 'ai' ? styles.aiWrapper : styles.callerWrapper
                                ]}>
                                    <View style={[
                                        styles.bubble,
                                        entry.role === 'ai' ? styles.aiBubble : styles.callerBubble
                                    ]}>
                                        <Text style={[
                                            styles.transcriptText,
                                            entry.role === 'ai' ? styles.aiText : styles.callerText
                                        ]}>
                                            {entry.content}
                                        </Text>
                                    </View>
                                    <Text style={styles.roleLabel}>
                                        {entry.role === 'ai' ? 'Ringia' : (call.callerName || 'Caller')}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyTranscript}>
                                <Text style={styles.emptyText}>No transcript generated for this call.</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.footerActions}>
                    <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                        <Text style={styles.btnText}>Share Insights</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                        <Text style={styles.deleteBtnText}>Delete Log permanently</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070712' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#070712' },
    scrollContent: { padding: 24 },
    backBtn: { alignSelf: 'flex-start', marginBottom: 10 },
    backEmoji: { fontSize: 28, color: '#6C5CE7' },
    header: { alignItems: 'center', marginBottom: 32 },
    intentIcon: {
        width: 88, height: 88, borderRadius: 24,
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
        borderWidth: 1, borderColor: '#1E1E35'
    },
    emoji: { fontSize: 44 },
    callerName: { fontSize: 26, fontWeight: '800', color: '#FFF', marginBottom: 6 },
    callerNumber: { fontSize: 15, color: '#666', marginBottom: 16, letterSpacing: 0.5 },
    badgeRow: { flexDirection: 'row', gap: 10 },
    badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    card: { backgroundColor: '#121225', borderRadius: 24, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: '#1E1E35' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardTitle: { fontSize: 14, fontWeight: '800', color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: 1 },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#333', marginHorizontal: 8 },
    durationText: { fontSize: 12, color: '#555' },
    summaryText: { fontSize: 17, color: '#EEE', lineHeight: 26, fontWeight: '500' },
    actionBox: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#1E1E35' },
    actionLabel: { fontSize: 11, color: '#00CEC9', fontWeight: '800', marginBottom: 6, letterSpacing: 0.5 },
    actionText: { fontSize: 15, color: '#AAA', lineHeight: 22 },
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 20 },
    transcriptContainer: { gap: 20 },
    bubbleWrapper: { maxWidth: '85%', marginBottom: 4 },
    aiWrapper: { alignSelf: 'flex-start' },
    callerWrapper: { alignSelf: 'flex-end' },
    bubble: { padding: 16, borderRadius: 20 },
    aiBubble: { backgroundColor: '#1A1A35', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#232345' },
    callerBubble: { backgroundColor: '#6C5CE7', borderBottomRightRadius: 4 },
    transcriptText: { fontSize: 15, lineHeight: 22 },
    aiText: { color: '#EEE' },
    callerText: { color: '#FFF', fontWeight: '500' },
    roleLabel: { fontSize: 10, color: '#555', marginTop: 6, fontWeight: '700', marginHorizontal: 4 },
    emptyTranscript: { padding: 30, alignItems: 'center', backgroundColor: '#121225', borderRadius: 20 },
    emptyText: { color: '#444', fontStyle: 'italic', fontSize: 14 },
    footerActions: { gap: 16, marginBottom: 40 },
    shareBtn: { backgroundColor: '#FFF', paddingVertical: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#FFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    btnText: { color: '#000', fontWeight: '800', fontSize: 16 },
    deleteBtn: { paddingVertical: 14, alignItems: 'center' },
    deleteBtnText: { color: '#FF7675', fontWeight: '700', fontSize: 14 },
});
