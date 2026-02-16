import React from "react";
import { motion } from "framer-motion";


/**
 * Base Dashboard Widget Component
 * Provides consistent styling and animations for all widgets
 */
export default function DashboardWidget({
    title,
    subtitle,
    icon: Icon,
    children,
    className = "",
    delay = 0,
    actions = null
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className={`bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden hover:shadow-md transition-shadow ${className}`}
        >
            {/* Header */}
            {(title || Icon) && (
                <div className="px-6 py-4 border-b border-amber-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {Icon && (
                                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brown-700 to-amber-600 flex items-center justify-center">
                                    <Icon className="h-5 w-5 text-white" />
                                </div>
                            )}
                            <div>
                                {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
                                {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                            </div>
                        </div>
                        {actions && <div>{actions}</div>}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="p-6">
                {children}
            </div>
        </motion.div>
    );
}

/**
 * Stats Widget - Display single stat with trend
 */
export function StatsWidget({
    label,
    value,
    icon: Icon,
    trend,
    trendUp = true,
    delay = 0,
    onClick = null
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay }}
            whileHover={{ scale: onClick ? 1.02 : 1 }}
            onClick={onClick}
            className={`bg-white rounded-2xl shadow-sm border border-amber-100 p-6 ${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-all`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brown-700 to-amber-600 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-white" />
                </div>
                {trend && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {trendUp ? '↗' : '↘'} {trend}
                    </span>
                )}
            </div>

            <div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
                <p className="text-sm text-gray-600">{label}</p>
            </div>
        </motion.div>
    );
}

/**
 * Activity Item Component
 */
function ActivityItem({ icon: Icon, title, time, color = "gray" }) {
    const colorClasses = {
        blue: "bg-blue-100 text-blue-600",
        green: "bg-green-100 text-green-600",
        purple: "bg-purple-100 text-purple-600",
        yellow: "bg-yellow-100 text-yellow-600",
        gray: "bg-gray-100 text-gray-600"
    };

    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
            <div className={`h-8 w-8 rounded-lg ${colorClasses[color]} flex items-center justify-center flex-shrink-0`}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 font-medium">{title}</p>
                <p className="text-xs text-gray-500">{time}</p>
            </div>
        </div>
    );
}

/**
 * Activity Widget - Show recent activities
 */
export function ActivityWidget({ activities = [], delay = 0 }) {
    return (
        <DashboardWidget
            title="Recent Activity"
            subtitle="Latest updates"
            delay={delay}
        >
            {activities.length > 0 ? (
                <div className="space-y-0">
                    {activities.map((activity, index) => (
                        <ActivityItem key={index} {...activity} />
                    ))}
                </div>
            ) : (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            )}
        </DashboardWidget>
    );
}

/**
 * Pending Action Item
 */
function PendingActionItem({ title, description, count, onClick }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
        >
            <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                readOnly
            />
            <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{title}</p>
                {description && <p className="text-xs text-gray-500">{description}</p>}
            </div>
            {count && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                    {count}
                </span>
            )}
        </button>
    );
}

/**
 * Pending Actions Widget
 */
export function PendingActionsWidget({ actions = [], delay = 0 }) {
    return (
        <DashboardWidget
            title="Pending Actions"
            subtitle="Tasks requiring attention"
            delay={delay}
        >
            {actions.length > 0 ? (
                <div className="space-y-1">
                    {actions.map((action, index) => (
                        <PendingActionItem key={index} {...action} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-3">
                        <span className="text-2xl">✓</span>
                    </div>
                    <p className="text-sm text-gray-600">All caught up!</p>
                </div>
            )}
        </DashboardWidget>
    );
}
