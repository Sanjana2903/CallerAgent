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
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header Section */}
                <View style={styles.header}>
                    <View style={[styles.intentIcon, { backgroundColor: config.color + '20' }]}>
                        <Text style={styles.emoji}>{config.emoji}</Text>
                    </View>
                    <Text style={styles.callerName}>{call.callerName || call.callerNumber}</Text>
                    {call.callerName && <Text style={styles.callerNumber}>{call.callerNumber}</Text>}

                    <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: config.color + '33' }]}>
                            <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: sentimentColor + '33' }]}>
                            <Text style={[styles.badgeText, { color: sentimentColor }]}>
                                {call.analysis?.sentiment?.toUpperCase() || 'NEUTRAL'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* AI Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>AI Summary</Text>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryText}>{call.analysis?.summary || 'No summary available'}</Text>
                        {call.analysis?.actionTaken && (
                            <View style={styles.actionBox}>
                                <Text style={styles.actionLabel}>AI ACTION TAKEN:</Text>
                                <Text style={styles.actionText}>{call.analysis.actionTaken}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Call Info */}
                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Time</Text>
                        <Text style={styles.infoValue}>
                            {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Duration</Text>
                        <Text style={styles.infoValue}>{Math.round(call.durationSeconds || 0)}s</Text>
                    </View>
                </View>

                {/* Transcript */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Full Transcript</Text>
                    <View style={styles.transcriptContainer}>
                        {call.transcript && call.transcript.length > 0 ? (
                            call.transcript.map((entry: TranscriptEntry, index: number) => (
                                <View key={index} style={styles.transcriptEntry}>
                                    <Text style={[styles.roleLabel, entry.role === 'ai' ? styles.aiRole : styles.callerRole]}>
                                        {entry.role === 'ai' ? 'RINGIA' : 'CALLER'}
                                    </Text>
                                    <Text style={styles.transcriptText}>{entry.content}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No transcript available</Text>
                        )}
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.footerActions}>
                    <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                        <Text style={styles.btnText}>Share Summary</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                        <Text style={styles.deleteBtnText}>Delete Record</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D0D1A' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D1A' },
    scrollContent: { padding: 20 },
    header: { alignItems: 'center', marginBottom: 30 },
    intentIcon: {
        width: 80, height: 80, borderRadius: 40,
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    emoji: { fontSize: 40 },
    callerName: { fontSize: 24, fontWeight: '700', color: '#FFF', marginBottom: 4 },
    callerNumber: { fontSize: 14, color: '#888', marginBottom: 12 },
    badgeRow: { flexDirection: 'row', gap: 8 },
    badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 12 },
    summaryBox: { backgroundColor: '#16162A', borderRadius: 16, padding: 16 },
    summaryText: { fontSize: 16, color: '#DDD', lineHeight: 24 },
    actionBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#2A2A40' },
    actionLabel: { fontSize: 11, color: '#6C5CE7', fontWeight: '800', marginBottom: 4 },
    actionText: { fontSize: 14, color: '#BBB' },
    infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    infoItem: { flex: 1, backgroundColor: '#16162A', borderRadius: 12, padding: 12 },
    infoLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
    infoValue: { fontSize: 16, color: '#FFF', fontWeight: '600' },
    transcriptContainer: { backgroundColor: '#16162A', borderRadius: 16, padding: 16 },
    transcriptEntry: { marginBottom: 16 },
    roleLabel: { fontSize: 10, fontWeight: '800', marginBottom: 4 },
    aiRole: { color: '#6C5CE7' },
    callerRole: { color: '#00CEC9' },
    transcriptText: { color: '#DDD', fontSize: 15, lineHeight: 22 },
    emptyText: { color: '#555', fontStyle: 'italic', textAlign: 'center' },
    footerActions: { gap: 12, marginTop: 10, marginBottom: 40 },
    shareBtn: { backgroundColor: '#6C5CE7', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    deleteBtn: { paddingVertical: 14, alignItems: 'center' },
    deleteBtnText: { color: '#FF7675', fontWeight: '600' },
});
