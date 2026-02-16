import { db } from "../utils/firebase";
import { ref, get, set } from "firebase/database";
import PromotionService from "./PromotionService";

/**
 * Service for managing term workflow automation
 * Handles term transitions, backups, and student promotions
 */
class TermWorkflowService {
    /**
     * Detect what type of term is ending
     * @param {object} currentTerm - Current term {year, name}
     * @returns {"term1"|"term2"|"term3"}
     */
    static getTermType(currentTerm) {
        if (!currentTerm || !currentTerm.name) return null;

        if (currentTerm.name.includes("1")) return "term1";
        if (currentTerm.name.includes("2")) return "term2";
        if (currentTerm.name.includes("3")) return "term3";

        return null;
    }

    /**
     * Calculate next term info
     * @param {object} currentTerm - Current term {year, name}
     * @returns {object} Next term {year, name}
     */
    static getNextTerm(currentTerm) {
        if (!currentTerm) return null;

        const term = currentTerm.name || "";
        const year = currentTerm.year || "";

        // Term 1 → Term 2
        if (term.includes("1")) {
            return { year, name: "Term 2" };
        }

        // Term 2 → Term 3
        if (term.includes("2")) {
            return { year, name: "Term 3" };
        }

        // Term 3 → Term 1 (next year)
        if (term.includes("3")) {
            try {
                const parts = year.split("/").map(Number);
                const nextYear = `${parts[0] + 1}/${(parts[1] + 1).toString().slice(-2)}`;
                return { year: nextYear, name: "Term 1" };
            } catch (e) {
                return { year, name: "Term 1" };
            }
        }

        return null;
    }

    /**
     * Create a backup of current term data
     * @param {object} term - Term to backup
     * @param {string} createdBy - User ID creating backup
     * @returns {Promise<{success: boolean, backupId?: string, error?: string}>}
     */
    static async createTermBackup(term, createdBy) {
        try {
            const termKey = `${term.year}-${term.name}`;

            // Fetch all data to backup
            const [studentsSnap, scoresSnap, midtermSnap, classesSnap, teachersSnap] = await Promise.all([
                get(ref(db, "students")),
                get(ref(db, "scores")),
                get(ref(db, `midtermScores/${term.year}/${term.name}`)),
                get(ref(db, "classes")),
                get(ref(db, "teachers")),
            ]);

            const payload = {
                meta: {
                    createdAt: new Date().toISOString(),
                    createdBy: createdBy || "system",
                    term,
                    type: "automatic",
                },
                students: studentsSnap.exists() ? studentsSnap.val() : {},
                scores: scoresSnap.exists() ? scoresSnap.val() : {},
                midtermScores: midtermSnap.exists() ? midtermSnap.val() : {},
                classes: classesSnap.exists() ? classesSnap.val() : {},
                teachers: teachersSnap.exists() ? teachersSnap.val() : {},
            };

            // Create versioned backup
            const backupId = Date.now().toString();
            await set(ref(db, `backups/stable/${termKey}/versions/${backupId}`), payload);
            await set(ref(db, `backups/stable/${termKey}/latest`), backupId);

            return { success: true, backupId };
        } catch (error) {
            console.error("Error creating backup:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create a template for next term
     * @param {object} nextTerm - Next term info
     * @param {boolean} clearScores - Whether to clear scores
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    static async createNextTermTemplate(nextTerm, clearScores = true) {
        try {
            const [classesSnap, studentsSnap] = await Promise.all([
                get(ref(db, "classes")),
                get(ref(db, "students")),
            ]);

            const template = {
                meta: {
                    createdAt: new Date().toISOString(),
                    next: nextTerm,
                },
                classes: classesSnap.exists() ? classesSnap.val() : {},
                students: {},
            };

            if (studentsSnap.exists()) {
                const data = studentsSnap.val();
                Object.keys(data).forEach((classId) => {
                    template.students[classId] = {};
                    const classData = data[classId] || {};
                    Object.keys(classData).forEach((studentId) => {
                        const s = classData[studentId];
                        template.students[classId][studentId] = {
                            firstName: s.firstName || "",
                            lastName: s.lastName || "",
                            gender: s.gender || "",
                            email: s.email || "",
                            class: classId,
                        };
                    });
                });
            }

            const nextKey = `${nextTerm.year}-${nextTerm.name}`;
            await set(ref(db, `backups/next/${nextKey}`), template);

            return { success: true };
        } catch (error) {
            console.error("Error creating next term template:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Execute complete term transition workflow
     * @param {string} currentUserId - Admin user ID
     * @param {function} onProgress - Progress callback
     * @returns {Promise<object>} Workflow results
     */
    static async executeTermTransition(currentUserId, onProgress = null) {
        const results = {
            success: false,
            steps: {
                fetchTerm: { success: false },
                createBackup: { success: false },
                promoteStudents: { success: false },
                clearScores: { success: false },
                updateTerm: { success: false },
                createTemplate: { success: false },
            },
            summary: {},
        };

        try {
            // Step 1: Get current term
            if (onProgress) onProgress("Fetching current term...", 1, 6);
            const termSnap = await get(ref(db, "terms/current"));
            if (!termSnap.exists()) {
                throw new Error("No current term set");
            }
            const currentTerm = termSnap.val();
            const termType = this.getTermType(currentTerm);
            const nextTerm = this.getNextTerm(currentTerm);
            results.steps.fetchTerm = { success: true, currentTerm, nextTerm, termType };

            // Step 2: Create backup
            if (onProgress) onProgress("Creating term backup...", 2, 6);
            const backupResult = await this.createTermBackup(currentTerm, currentUserId);
            results.steps.createBackup = backupResult;
            if (!backupResult.success) {
                throw new Error(`Backup failed: ${backupResult.error}`);
            }

            // Step 3: Promote students (only if Term 3)
            if (termType === "term3") {
                if (onProgress) onProgress("Promoting students to next class...", 3, 6);
                const promotionResults = await PromotionService.promoteAllClasses((msg) => {
                    if (onProgress) onProgress(msg, 3, 6);
                });
                results.steps.promoteStudents = { success: true, ...promotionResults };
            } else {
                results.steps.promoteStudents = { success: true, skipped: true, reason: "Not Term 3" };
            }

            // Step 4: Clear scores for new term
            if (onProgress) onProgress("Preparing for next term...", 4, 6);
            await set(ref(db, "scores"), {});
            results.steps.clearScores = { success: true };

            // Step 5: Update current term
            if (onProgress) onProgress("Updating term information...", 5, 6);
            await set(ref(db, "terms/current"), nextTerm);
            results.steps.updateTerm = { success: true, newTerm: nextTerm };

            // Step 6: Create next term template
            if (onProgress) onProgress("Creating next term template...", 6, 6);
            const templateResult = await this.createNextTermTemplate(nextTerm);
            results.steps.createTemplate = templateResult;

            // Calculate summary
            results.success = true;
            results.summary = {
                termTransition: `${currentTerm.year} ${currentTerm.name} → ${nextTerm.year} ${nextTerm.name}`,
                backupId: backupResult.backupId,
                studentsPromoted: termType === "term3",
                termType,
            };

            if (results.steps.promoteStudents.JHS1) {
                const p = results.steps.promoteStudents;
                results.summary.promotionStats = {
                    JHS1: p.JHS1.promoted,
                    JHS2: p.JHS2.promoted,
                    graduated: p.JHS3.graduated,
                };
            }

            return results;
        } catch (error) {
            console.error("Error in term transition:", error);
            results.error = error.message;
            return results;
        }
    }

    /**
     * Get preview of what will happen in term transition
     * @returns {Promise<object>} Preview information
     */
    static async getTransitionPreview() {
        try {
            const termSnap = await get(ref(db, "terms/current"));
            if (!termSnap.exists()) {
                return { error: "No current term set" };
            }

            const currentTerm = termSnap.val();
            const termType = this.getTermType(currentTerm);
            const nextTerm = this.getNextTerm(currentTerm);
            const isYearEnd = termType === "term3";

            // Get student counts if year-end
            let classStats = null;
            if (isYearEnd) {
                classStats = {
                    JHS1: await this.getClassStudentCount("JHS1"),
                    JHS2: await this.getClassStudentCount("JHS2"),
                    JHS3: await this.getClassStudentCount("JHS3"),
                };
            }

            return {
                currentTerm,
                nextTerm,
                termType,
                isYearEnd,
                classStats,
                actions: {
                    createBackup: true,
                    promoteStudents: isYearEnd,
                    clearScores: true,
                    createTemplate: true,
                },
            };
        } catch (error) {
            console.error("Error getting preview:", error);
            return { error: error.message };
        }
    }

    /**
     * Helper: Get student count in a class
     */
    static async getClassStudentCount(classId) {
        const snap = await get(ref(db, `students/${classId}`));
        return snap.exists() ? Object.keys(snap.val()).length : 0;
    }
}

export default TermWorkflowService;
