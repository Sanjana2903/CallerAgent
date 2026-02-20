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
        <TouchableOpacity style={styles.callItem} onPress={onPress}>
            <View style={[styles.intentIcon, { backgroundColor: config.color + '20' }]}>
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
                    {item.analysis?.summary || 'No summary available'}
                </Text>
                <View style={styles.statusRow}>
                    <Text style={styles.dateText}>{dateStr}</Text>
                    <View style={styles.dot} />
                    <Text style={[styles.statusBadge, { color: config.color }]}>
                        {config.label}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function HomeScreen({ navigation }: any) {
    const { user, updateStatus } = useAuthStore();
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
            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Processed</Text>
                    <Text style={styles.statValue}>{callHistory.length}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>AI Efficiency</Text>
                    <Text style={styles.statValue}>98%</Text>
                </View>
            </View>

            {activeCall && (
                <TouchableOpacity
                    style={styles.activeCallBanner}
                    onPress={() => navigation.navigate('LiveCall')}
                >
                    <View style={styles.pulseDot} />
                    <Text style={styles.activeCallText}>LIVE: Call in progress with {activeCall.callerName || activeCall.callerNumber}</Text>
                </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>Recent Calls</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {isLoadingHistory && callHistory.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator color="#6C5CE7" size="large" />
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
                            <Text style={styles.emptyIcon}>📭</Text>
                            <Text style={styles.emptyText}>No call history yet</Text>
                            <Text style={styles.emptySubtext}>Calls forwarded to Ringia will appear here</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D0D1A' },
    listContent: { paddingBottom: 20 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listHeader: { padding: 20 },
    statsContainer: {
        flexDirection: 'row', backgroundColor: '#16162A',
        borderRadius: 16, padding: 16, marginBottom: 24,
        alignItems: 'center',
    },
    statBox: { flex: 1, alignItems: 'center' },
    statLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
    statValue: { color: '#FFF', fontSize: 18, fontWeight: '700' },
    divider: { width: 1, height: 30, backgroundColor: '#2A2A40' },
    activeCallBanner: {
        backgroundColor: '#6C5CE7', padding: 14, borderRadius: 12,
        flexDirection: 'row', alignItems: 'center', marginBottom: 24,
    },
    pulseDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: '#FFF', marginRight: 10,
        // Add animation later
    },
    activeCallText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 12 },
    callItem: {
        flexDirection: 'row', padding: 16, borderBottomWidth: 1,
        borderBottomColor: '#1E1E35', alignItems: 'center',
    },
    intentIcon: {
        width: 48, height: 48, borderRadius: 24,
        justifyContent: 'center', alignItems: 'center', marginRight: 16,
    },
    emoji: { fontSize: 24 },
    callInfo: { flex: 1 },
    callHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    callerName: { fontSize: 16, fontWeight: '700', color: '#FFF', flex: 1, marginRight: 8 },
    timeText: { fontSize: 12, color: '#555' },
    summaryText: { fontSize: 14, color: '#999', marginBottom: 6 },
    statusRow: { flexDirection: 'row', alignItems: 'center' },
    dateText: { fontSize: 11, color: '#555' },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#333', marginHorizontal: 6 },
    statusBadge: { fontSize: 11, fontWeight: '600' },
    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyIcon: { fontSize: 60, marginBottom: 16 },
    emptyText: { color: '#888', fontSize: 18, fontWeight: '600' },
    emptySubtext: { color: '#555', fontSize: 14, textAlign: 'center', marginTop: 8 },
});
