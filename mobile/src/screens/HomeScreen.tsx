import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    RefreshControl, StatusBar, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useAuthStore, useCallStore } from '../store';
import { INTENT_CONFIG } from '../utils/constants';

const CallItem = ({ item, onPress }: any) => {
    const intent = item.analysis?.intent || '';
    const config = INTENT_CONFIG[intent] || INTENT_CONFIG['personal.unknown'];
    const date = new Date(item.createdAt);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

    return (
        <TouchableOpacity style={styles.callItem} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.intentIcon, { backgroundColor: config.color + '15' }]}>
                <Text style={styles.emoji}>{config.emoji}</Text>
            </View>
            <View style={styles.callInfo}>
                <View style={styles.callHeader}>
                    <Text style={styles.callerName} numberOfLines={1}>
                        {item.callerName || item.callerNumber}
                    </Text>
                    <Text style={styles.timeText}>{timeStr}</Text>
                </View>
                <Text style={styles.summaryText} numberOfLines={1}>
                    {item.analysis?.summary || 'Call handled by AI'}
                </Text>
                <View style={styles.statusRow}>
                    <View style={[styles.statusBadge, { backgroundColor: config.color + '25' }]}>
                        <Text style={[styles.statusBadgeText, { color: config.color }]}>
                            {config.label}
                        </Text>
                    </View>
                    <Text style={styles.dateText}>{dateStr}</Text>
                </View>
            </View>
            <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
    );
};

export default function HomeScreen({ navigation }: any) {
    const { user } = useAuthStore();
    const { callHistory, activeCall, loadHistory, refreshHistory, isLoadingHistory } = useCallStore();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadHistory();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshHistory();
        setRefreshing(false);
    }, []);

    const renderHeader = () => (
        <View style={styles.listHeader}>
            <View style={styles.welcomeRow}>
                <View>
                    <Text style={styles.welcomeText}>Hello, {user?.name?.split(' ')[0] || 'User'}! 👋</Text>
                    <Text style={styles.subWelcome}>Your assistant is active and standing by.</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.profileBtn}>
                    <Text style={styles.profileEmoji}>👤</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
                <View style={[styles.statBox, { borderRightWidth: 1, borderRightColor: '#2A2A40' }]}>
                    <Text style={styles.statValue}>{callHistory.length}</Text>
                    <Text style={styles.statLabel}>Calls Screened</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: '#00CEC9' }]}>98%</Text>
                    <Text style={styles.statLabel}>AI Accuracy</Text>
                </View>
            </View>

            {activeCall && (
                <TouchableOpacity
                    style={styles.activeCallBanner}
                    onPress={() => navigation.navigate('LiveCall')}
                >
                    <View style={styles.pulseDot} />
                    <Text style={styles.activeCallText}>LIVE: AI is talking to {activeCall.callerName || activeCall.callerNumber}...</Text>
                </TouchableOpacity>
            )}

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Call History</Text>
                <TouchableOpacity onPress={onRefresh}>
                    <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {isLoadingHistory && callHistory.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator color="#6C5CE7" size="large" />
                    <Text style={styles.loadingText}>Fetching history...</Text>
                </View>
            ) : (
                <FlatList
                    data={callHistory}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                        <CallItem
                            item={item}
                            onPress={() => navigation.navigate('CallDetail', { callId: item._id })}
                        />
                    )}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyCircle}>
                                <Text style={styles.emptyIcon}>📞</Text>
                            </View>
                            <Text style={styles.emptyText}>History is empty</Text>
                            <Text style={styles.emptySubtext}>When people call your Twilio number, their transcripts will appear here.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070712' },
    listContent: { paddingBottom: 40 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#666', marginTop: 12, fontSize: 13 },
    listHeader: { padding: 24 },
    welcomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    welcomeText: { fontSize: 28, fontWeight: '800', color: '#FFF' },
    subWelcome: { fontSize: 14, color: '#888', marginTop: 4 },
    profileBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#16162A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#2A2A40' },
    profileEmoji: { fontSize: 20 },
    statsContainer: {
        flexDirection: 'row', backgroundColor: '#16162A',
        borderRadius: 20, padding: 20, marginBottom: 28,
        borderWidth: 1, borderColor: '#23233A',
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20,
    },
    statBox: { flex: 1, alignItems: 'center' },
    statLabel: { color: '#666', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    statValue: { color: '#FFF', fontSize: 24, fontWeight: '800', marginBottom: 4 },
    activeCallBanner: {
        backgroundColor: '#6C5CE7', padding: 16, borderRadius: 16,
        flexDirection: 'row', alignItems: 'center', marginBottom: 28,
        shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12,
    },
    pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF', marginRight: 12 },
    activeCallText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    refreshText: { color: '#6C5CE7', fontWeight: '600' },
    callItem: {
        flexDirection: 'row', padding: 16, marginHorizontal: 20, marginBottom: 12,
        backgroundColor: '#121225', borderRadius: 18, alignItems: 'center',
        borderWidth: 1, borderColor: '#1E1E35'
    },
    intentIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    emoji: { fontSize: 28 },
    callInfo: { flex: 1 },
    callHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    callerName: { fontSize: 17, fontWeight: '700', color: '#FFF', flex: 1, marginRight: 8 },
    timeText: { fontSize: 12, color: '#666' },
    summaryText: { fontSize: 14, color: '#AAA', marginBottom: 8, lineHeight: 18 },
    statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    dateText: { fontSize: 11, color: '#555' },
    chevron: { color: '#333', fontSize: 24, marginLeft: 8 },
    emptyContainer: { padding: 40, alignItems: 'center', marginTop: 40 },
    emptyCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#16162A', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyIcon: { fontSize: 48 },
    emptyText: { color: '#888', fontSize: 18, fontWeight: '700' },
    emptySubtext: { color: '#555', fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 },
});
