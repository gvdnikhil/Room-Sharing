import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useRoomStore } from '../store/roomStore';
import type { Item, RestockInsightEntry, UsageSummaryEntry } from '../types';
import ItemCard from '../components/ItemCard';
import ConsumeModal from '../components/ConsumeModal';
import UsageSummaryModal from '../components/UsageSummaryModal';
import { Plus, Check, Hash, DoorOpen, Loader2, RefreshCw, ShoppingCart, AlertTriangle } from 'lucide-react';

const Dashboard = () => {
    const { currentRoom, setRoom, clearRoom } = useRoomStore();
    const queryClient = useQueryClient();
    const [isCopied, setIsCopied] = useState(false);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [newRoomName, setNewRoomName] = useState('');
    const [itemToConsume, setItemToConsume] = useState<Item | null>(null);
    const [itemForSummary, setItemForSummary] = useState<Item | null>(null);
    const [newItem, setNewItem] = useState({ name: '', total_quantity: 0, unit: 'pieces' });

    // Queries
    const { data: items, isLoading: itemsLoading, error: itemsError } = useQuery<Item[]>({
        queryKey: ['items', currentRoom?.id],
        queryFn: async () => {
            const { data } = await api.get(`/rooms/${currentRoom?.id}/items`);
            return data;
        },
        enabled: !!currentRoom?.id,
    });

    const { data: usageSummary } = useQuery<UsageSummaryEntry[]>({
        queryKey: ['usage-summary', itemForSummary?.id],
        queryFn: async () => {
            const { data } = await api.get(`/items/${itemForSummary?.id}/usage-summary`);
            return data;
        },
        enabled: !!itemForSummary?.id,
    });


    const { data: restockInsights } = useQuery<RestockInsightEntry[]>({
        queryKey: ['restock-insights', currentRoom?.id],
        queryFn: async () => {
            const { data } = await api.get(`/rooms/${currentRoom?.id}/restock-insights?days=14`);
            return data;
        },
        enabled: !!currentRoom?.id,
    });

    // Mutations
    const joinRoomMutation = useMutation({
        mutationFn: async (invite_code: string) => {
            const { data } = await api.post('/rooms/join', { invite_code });
            return data;
        },
        onSuccess: (data) => setRoom(data),
    });

    const createRoomMutation = useMutation({
        mutationFn: async (name: string) => {
            const { data } = await api.post('/rooms', { name });
            return data;
        },
        onSuccess: (data) => setRoom(data),
    });

    const addItemMutation = useMutation({
        mutationFn: async () => {
            const { data } = await api.post(`/rooms/${currentRoom?.id}/items`, newItem);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            queryClient.invalidateQueries({ queryKey: ['activity'] });
            queryClient.invalidateQueries({ queryKey: ['restock-insights'] });
            setIsAddingItem(false);
            setNewItem({ name: '', total_quantity: 0, unit: 'pieces' });
        },
    });

    const consumeMutation = useMutation({
        mutationFn: async ({ itemId, quantity, userId }: { itemId: string; quantity: number; userId?: string }) => {
            const { data } = await api.post(`/items/${itemId}/consume`, { quantity, user_id: userId });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            queryClient.invalidateQueries({ queryKey: ['activity'] });
            queryClient.invalidateQueries({ queryKey: ['restock-insights'] });
            setItemToConsume(null);
        },
    });


    const deleteItemMutation = useMutation({
        mutationFn: async (itemId: string) => {
            await api.delete(`/items/${itemId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            queryClient.invalidateQueries({ queryKey: ['restock-insights'] });
        },
        onError: (error: any) => {
            console.error('Delete failed:', error);
            alert('Failed to delete item. Please make sure the backend is updated and running.');
        }
    });

    const copyInviteCode = () => {
        if (currentRoom?.invite_code) {
            navigator.clipboard.writeText(currentRoom.invite_code);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const handleConsume = (itemId: string) => {
        const item = items?.find(i => i.id === itemId);
        if (item) {
            setItemToConsume(item);
        }
    };

    const handleRefill = (item: Item) => {
        setNewItem({
            name: item.name,
            total_quantity: item.total_quantity,
            unit: item.unit,
        });
        setIsAddingItem(true);
    };

    const handleDelete = (itemId: string) => {
        console.log('handleDelete triggered for:', itemId);
        if (window.confirm('Are you sure you want to delete this item? This cannot be undone.')) {
            console.log('Confirmed deletion for:', itemId);
            deleteItemMutation.mutate(itemId);
        }
    };

    const handleSummary = (item: Item) => {
        setItemForSummary(item);
    };

    // ── No Room View ───────────────────────────────────────────────────────────
    if (!currentRoom) {
        return (
            <div className="max-w-2xl mx-auto space-y-8 py-12">
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4 italic">Get Started</h1>
                    <p className="text-slate-600 dark:text-slate-400">Join an existing room or create a new one for your house.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center space-x-3 mb-6">
                            <Hash className="w-5 h-5 text-indigo-500" />
                            <h2 className="text-xl font-bold dark:text-white">Join Room</h2>
                        </div>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Enter Invite Code"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                            />
                            <button
                                onClick={() => joinRoomMutation.mutate(joinCode)}
                                disabled={joinRoomMutation.isPending || !joinCode}
                                className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
                            >
                                {joinRoomMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Join Room</span>}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center space-x-3 mb-6">
                            <DoorOpen className="w-5 h-5 text-purple-500" />
                            <h2 className="text-xl font-bold dark:text-white">New Room</h2>
                        </div>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Room Name (e.g. 221B Baker St)"
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 dark:text-white"
                            />
                            <button
                                onClick={() => createRoomMutation.mutate(newRoomName)}
                                disabled={createRoomMutation.isPending || !newRoomName}
                                className="w-full py-3 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
                            >
                                {createRoomMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Create Room</span>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Dashboard View ─────────────────────────────────────────────────────────
    return (
        <div className="space-y-8">
            {/* Header Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-500/20">
                    <p className="text-indigo-100 text-sm font-medium uppercase tracking-wider mb-1">Invite Friends</p>
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold truncate">{currentRoom.invite_code}</h2>
                        <button
                            onClick={copyInviteCode}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
                        >
                            {isCopied ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5 rotate-45" />}
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Total Items</p>
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-bold dark:text-white">{items?.length || 0}</h2>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl">
                            <ShoppingCart className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Low Stock</p>
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-bold dark:text-white">
                            {items?.filter(i => (i.remaining_quantity / i.total_quantity) < 0.2 && i.remaining_quantity > 0).length || 0}
                        </h2>
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-2xl">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Inventory Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Inventory</h1>
                    <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Manage your shared groceries in real-time.</p>
                </div>

                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => setIsAddingItem(true)}
                        className="bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center shadow-lg transition-transform active:scale-95"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add New Item
                    </button>
                </div>
            </div>


            {restockInsights && restockInsights.length > 0 && (
                <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Smart Restock Insights</h2>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Last 14 days</span>
                    </div>
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {restockInsights.slice(0, 6).map((insight) => (
                            <div key={insight.item_id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold text-slate-900 dark:text-white">{insight.item_name}</p>
                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                        insight.urgency === 'urgent'
                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                            : insight.urgency === 'watch'
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                    }`}>
                                        {insight.urgency}
                                    </span>
                                </div>
                                <p className="text-sm mt-2 text-slate-600 dark:text-slate-300">
                                    {insight.remaining_quantity} / {insight.total_quantity} {insight.unit} left
                                </p>
                                <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                                    Avg daily usage: {insight.avg_daily_usage.toFixed(2)} {insight.unit}
                                </p>
                                <p className="text-xs mt-1 font-medium text-slate-700 dark:text-slate-200">
                                    {insight.estimated_days_left
                                        ? `Estimated runout in ${Math.max(1, Math.round(insight.estimated_days_left))} day(s)`
                                        : 'Not enough usage data to estimate runout'}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Items Grid */}
            {itemsError ? (
                <div className="p-12 text-center bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-[3rem]">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-900 dark:text-red-400 font-bold text-lg">Failed to load inventory</p>
                    <p className="text-red-600 dark:text-red-500 mb-6">This could be due to a connection error or you might no longer have access to this room.</p>
                    <button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['items'] })}
                        className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => clearRoom()}
                        className="ml-4 px-6 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                        Switch Room
                    </button>
                </div>
            ) : itemsLoading ? (
                <div className="flex justify-center items-center py-20">
                    <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {items?.map((item) => (
                        <ItemCard
                            key={item.id}
                            item={item}
                            onConsume={handleConsume}
                            onRefill={handleRefill}
                            onDelete={handleDelete}
                            onClick={handleSummary}
                        />
                    ))}
                    {items?.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-slate-100 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <p className="text-slate-500 dark:text-slate-400 font-medium">No items yet. Start by adding one!</p>
                        </div>
                    )}
                </div>
            )}

            {/* Add Item Modal (Simple implementation) */}
            {isAddingItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold mb-6 dark:text-white">Add Grocery Item</h2>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-500 ml-1">Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Eggs"
                                    autoFocus
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-500 ml-1">Quantity</label>
                                    <input
                                        type="number"
                                        placeholder="30"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                        value={newItem.total_quantity || ''}
                                        onChange={(e) => setNewItem({ ...newItem, total_quantity: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-500 ml-1">Unit</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:text-white appearance-none"
                                        value={newItem.unit}
                                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                    >
                                        <option value="pieces">Pieces</option>
                                        <option value="liters">Liters</option>
                                        <option value="kg">KG</option>
                                        <option value="ml">ML</option>
                                        <option value="packs">Packs</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex space-x-3 mt-8">
                                <button
                                    onClick={() => setIsAddingItem(false)}
                                    className="flex-1 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => addItemMutation.mutate()}
                                    disabled={!newItem.name || !newItem.total_quantity}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Consume Modal */}
            {itemToConsume && (
                <ConsumeModal
                    item={itemToConsume}
                    members={currentRoom.members}
                    onClose={() => setItemToConsume(null)}
                    onConsume={(itemId, quantity, userId) => consumeMutation.mutate({ itemId, quantity, userId })}
                    isPending={consumeMutation.isPending}
                />
            )}


            {/* Usage Summary Modal */}
            {itemForSummary && usageSummary && (
                <UsageSummaryModal
                    itemName={itemForSummary.name}
                    summary={usageSummary}
                    onClose={() => setItemForSummary(null)}
                />
            )}
        </div>
    );
};

export default Dashboard;
