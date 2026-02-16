import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Users, GraduationCap, Archive, CheckCircle, XCircle, Loader } from "lucide-react";
import TermWorkflowService from "../../services/TermWorkflowService";

/**
 * Modal dialog for confirming and executing term transitions
 * Shows preview, progress, and results
 */
export default function TermTransitionDialog({ isOpen, onClose, onComplete, currentUserId }) {
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [progress, setProgress] = useState({ message: "", step: 0, total: 6 });
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadPreview();
        }
    }, [isOpen]);

    const loadPreview = async () => {
        setLoading(true);
        setError(null);
        try {
            const previewData = await TermWorkflowService.getTransitionPreview();
            if (previewData.error) {
                setError(previewData.error);
            } else {
                setPreview(previewData);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExecute = async () => {
        setExecuting(true);
        setError(null);
        setResults(null);

        try {
            const workflowResults = await TermWorkflowService.executeTermTransition(
                currentUserId,
                (message, step, total) => {
                    setProgress({ message, step, total });
                }
            );

            if (workflowResults.success) {
                setResults(workflowResults);
                setTimeout(() => {
                    if (onComplete) onComplete(workflowResults);
                }, 2000);
            } else {
                setError(workflowResults.error || "Term transition failed");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setExecuting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-8 w-8" />
                            <div>
                                <h2 className="text-2xl font-bold">Term Transition</h2>
                                <p className="text-indigo-100 text-sm mt-1">
                                    {preview?.isYearEnd ? "Complete Academic Year" : "Move to Next Term"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader className="h-8 w-8 animate-spin text-indigo-600" />
                                <span className="ml-3 text-gray-600">Loading preview...</span>
                            </div>
                        ) : error ? (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-red-800">
                                    <XCircle className="h-5 w-5" />
                                    <span className="font-semibold">Error</span>
                                </div>
                                <p className="text-red-700 mt-2 text-sm">{error}</p>
                            </div>
                        ) : results ? (
                            /* Success Screen */
                            <div className="space-y-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-green-800">
                                        <CheckCircle className="h-6 w-6" />
                                        <span className="font-bold text-lg">Transition Successful!</span>
                                    </div>
                                    <p className="text-green-700 mt-2">
                                        {results.summary.termTransition}
                                    </p>
                                </div>

                                {results.summary.promotionStats && (
                                    <div className="grid grid-cols-3 gap-3  mt-4">
                                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                                            <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                                            <p className="text-2xl font-bold text-blue-900">
                                                {results.summary.promotionStats.JHS1}
                                            </p>
                                            <p className="text-xs text-blue-700">JHS1 → JHS2</p>
                                        </div>
                                        <div className="bg-purple-50 rounded-lg p-4 text-center">
                                            <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                                            <p className="text-2xl font-bold text-purple-900">
                                                {results.summary.promotionStats.JHS2}
                                            </p>
                                            <p className="text-xs text-purple-700">JHS2 → JHS3</p>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-4 text-center">
                                            <GraduationCap className="h-6 w-6 text-green-600 mx-auto mb-2" />
                                            <p className="text-2xl font-bold text-green-900">
                                                {results.summary.promotionStats.graduated}
                                            </p>
                                            <p className="text-xs text-green-700">Graduated</p>
                                        </div>
                                    </div>
                                )}

                                <div className="text-center mt-6">
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        ) : executing ? (
                            /* Progress Screen */
                            <div className="space-y-4">
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                                        <span>{progress.message}</span>
                                        <span>{progress.step} / {progress.total}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(progress.step / progress.total) * 100}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-center py-6">
                                    <Loader className="h-12 w-12 animate-spin text-indigo-600" />
                                </div>

                                <p className="text-center text-gray-600 text-sm">
                                    Please wait, this may take a few moments...
                                </p>
                            </div>
                        ) : preview ? (
                            /* Preview Screen */
                            <div className="space-y-4">
                                {/* Current → Next */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-600 mb-2">Transition</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 text-center">
                                            <p className="font-bold text-gray-900">{preview.currentTerm.year}</p>
                                            <p className="text-sm text-gray-600">{preview.currentTerm.name}</p>
                                        </div>
                                        <div className="text-2xl text-gray-400">→</div>
                                        <div className="flex-1 text-center">
                                            <p className="font-bold text-indigo-900">{preview.nextTerm.year}</p>
                                            <p className="text-sm text-indigo-600">{preview.nextTerm.name}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="border-t border-gray-200 pt-4">
                                    <p className="font-semibold text-gray-900 mb-3">This will:</p>
                                    <ul className="space-y-2">
                                        <li className="flex items-start gap-2">
                                            <Archive className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                            <span className="text-sm text-gray-700">Create a backup of current term data</span>
                                        </li>
                                        {preview.isYearEnd && preview.classStats && (
                                            <li className="flex items-start gap-2">
                                                <Users className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                                <div className="text-sm text-gray-700">
                                                    <p className="font-medium">Promote all students to next class:</p>
                                                    <ul className="ml-4 mt-1 space-y-1 text-xs text-gray-600">
                                                        <li>• {preview.classStats.JHS1} students: JHS1 → JHS2</li>
                                                        <li>• {preview.classStats.JHS2} students: JHS2 → JHS3</li>
                                                        <li>• {preview.classStats.JHS3} students: JHS3 → Graduate</li>
                                                    </ul>
                                                </div>
                                            </li>
                                        )}
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            <span className="text-sm text-gray-700">Clear scores for new term</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                                            <span className="text-sm text-gray-700">Set current term to {preview.nextTerm.year} - {preview.nextTerm.name}</span>
                                        </li>
                                    </ul>
                                </div>

                                {preview.isYearEnd && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-semibold text-yellow-900 text-sm">Year-End Transition</p>
                                                <p className="text-yellow-800 text-xs mt-1">
                                                    This is a major transition that will promote all students and archive graduates. Make sure all scores are finalized before proceeding.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Buttons */}
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleExecute}
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                                    >
                                        {preview.isYearEnd ? "Proceed with Caution" : "Proceed"}
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
