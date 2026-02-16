import { db } from "../utils/firebase";
import { ref, get, set, update, remove } from "firebase/database";

/**
 * Service for handling student promotion between classes
 * Manages promotion from JHS1 → JHS2 → JHS3 → Graduate
 */
class PromotionService {
    /**
     * Class promotion mapping
     */
    static PROMOTION_MAP = {
        JHS1: "JHS2",
        JHS2: "JHS3",
        JHS3: "GRADUATE",
    };

    /**
     * Get the next class for a given class ID
     */
    static getNextClass(currentClass) {
        return this.PROMOTION_MAP[currentClass] || null;
    }

    /**
     * Check if a class can be promoted
     */
    static canPromote(currentClass) {
        return currentClass in this.PROMOTION_MAP;
    }

    /**
     * Promote a single student to the next class
     * @param {string} studentId - Student's UID
     * @param {string} fromClass - Current class (e.g., "JHS1")
     * @param {string} toClass - Target class (e.g., "JHS2")
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    static async promoteStudent(studentId, fromClass, toClass = null) {
        try {
            // If no target class specified, use automatic promotion
            const targetClass = toClass || this.getNextClass(fromClass);

            if (!targetClass) {
                return { success: false, error: `No promotion path for ${fromClass}` };
            }

            // Get student data
            const studentRef = ref(db, `students/${fromClass}/${studentId}`);
            const studentSnap = await get(studentRef);

            if (!studentSnap.exists()) {
                return { success: false, error: `Student not found in ${fromClass}` };
            }

            const studentData = studentSnap.val();

            // Handle graduation
            if (targetClass === "GRADUATE") {
                return await this.graduateStudent(studentId, fromClass, studentData);
            }

            // Move student to new class
            const newStudentRef = ref(db, `students/${targetClass}/${studentId}`);
            await set(newStudentRef, {
                ...studentData,
                class: targetClass,
                promotedFrom: fromClass,
                promotedAt: new Date().toISOString(),
            });

            // Remove from old class
            await remove(studentRef);

            // Update user's class reference
            const userRef = ref(db, `users/${studentId}/class`);
            await set(userRef, targetClass);

            return { success: true };
        } catch (error) {
            console.error("Error promoting student:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Graduate a student (move to graduates archive)
     * @param {string} studentId - Student's UID
     * @param {string} fromClass - Current class ("JHS3")
     * @param {object} studentData - Student's data
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    static async graduateStudent(studentId, fromClass, studentData) {
        try {
            // Get current term for graduation year
            const termSnap = await get(ref(db, "terms/current"));
            const term = termSnap.exists() ? termSnap.val() : {};
            const graduationYear = term.year || new Date().getFullYear();

            // Archive to graduates
            const graduateRef = ref(db, `graduates/${graduationYear}/${studentId}`);
            await set(graduateRef, {
                ...studentData,
                graduatedFrom: fromClass,
                graduationYear,
                graduatedAt: new Date().toISOString(),
            });

            // Remove from active students
            await remove(ref(db, `students/${fromClass}/${studentId}`));

            // Update user status
            await update(ref(db, `users/${studentId}`), {
                status: "graduated",
                graduationYear,
                class: null,
            });

            return { success: true };
        } catch (error) {
            console.error("Error graduating student:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Promote all students in a class
     * @param {string} classId - Class to promote (e.g., "JHS1")
     * @param {function} onProgress - Progress callback (studentId, index, total)
     * @returns {Promise<{promoted: number, graduated: number, failed: number, errors: array}>}
     */
    static async bulkPromoteClass(classId, onProgress = null) {
        try {
            const targetClass = this.getNextClass(classId);
            if (!targetClass) {
                throw new Error(`Cannot promote ${classId} - no promotion path defined`);
            }

            // Get all students in the class
            const studentsSnap = await get(ref(db, `students/${classId}`));
            if (!studentsSnap.exists()) {
                return { promoted: 0, graduated: 0, failed: 0, errors: [] };
            }

            const students = studentsSnap.val();
            const studentIds = Object.keys(students);
            const total = studentIds.length;

            let promoted = 0;
            let graduated = 0;
            let failed = 0;
            const errors = [];

            // Promote each student
            for (let i = 0; i < studentIds.length; i++) {
                const studentId = studentIds[i];

                // Call progress callback
                if (onProgress) {
                    onProgress(studentId, i + 1, total);
                }

                const result = await this.promoteStudent(studentId, classId, targetClass);

                if (result.success) {
                    if (targetClass === "GRADUATE") {
                        graduated++;
                    } else {
                        promoted++;
                    }
                } else {
                    failed++;
                    errors.push({
                        studentId,
                        error: result.error,
                    });
                }
            }

            return { promoted, graduated, failed, errors };
        } catch (error) {
            console.error("Error in bulk promotion:", error);
            throw error;
        }
    }

    /**
     * Get a preview of what will happen when promoting a class
     * @param {string} classId - Class to preview
     * @returns {Promise<{fromClass: string, toClass: string, studentCount: number, isGraduation: boolean}>}
     */
    static async getPromotionPreview(classId) {
        try {
            const targetClass = this.getNextClass(classId);
            if (!targetClass) {
                return null;
            }

            const studentsSnap = await get(ref(db, `students/${classId}`));
            const studentCount = studentsSnap.exists() ? Object.keys(studentsSnap.val()).length : 0;

            return {
                fromClass: classId,
                toClass: targetClass,
                studentCount,
                isGraduation: targetClass === "GRADUATE",
            };
        } catch (error) {
            console.error("Error getting promotion preview:", error);
            return null;
        }
    }

    /**
     * Rollback a promotion using a backup
     * @param {string} backupId - Backup version to restore from
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    static async rollbackPromotion(backupId) {
        try {
            // This would restore students from a backup
            // Implementation depends on backup structure
            console.log("Rollback from backup:", backupId);

            // TODO: Implement backup restoration logic
            return { success: true };
        } catch (error) {
            console.error("Error rolling back promotion:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Promote all classes at end of academic year
     * @param {function} onProgress - Progress callback
     * @returns {Promise<object>} Summary of promotions
     */
    static async promoteAllClasses(onProgress = null) {
        const results = {
            JHS1: { promoted: 0, graduated: 0, failed: 0, errors: [] },
            JHS2: { promoted: 0, graduated: 0, failed: 0, errors: [] },
            JHS3: { promoted: 0, graduated: 0, failed: 0, errors: [] },
        };

        for (const classId of ["JHS1", "JHS2", "JHS3"]) {
            if (onProgress) {
                onProgress(`Promoting ${classId}...`);
            }

            results[classId] = await this.bulkPromoteClass(classId, (studentId, index, total) => {
                if (onProgress) {
                    onProgress(`Promoting ${classId}: ${index}/${total}`);
                }
            });
        }

        return results;
    }
}

export default PromotionService;
