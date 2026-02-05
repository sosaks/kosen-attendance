/**
 * 沖縄高専 出席管理アプリ - 計算モジュール
 * 出席計算ロジック（3遅刻=1欠課ルール対応）
 */

const Calculator = {
    /**
     * 科目の出席統計を計算
     * @param {string} subjectId - 科目ID
     * @returns {object} 統計情報
     */
    calculateStats(subjectId) {
        const subject = Storage.getSubjectById(subjectId);
        if (!subject) return null;

        // 紐付けられた科目グループを取得
        const linkedSubjects = Storage.getLinkedSubjects(subjectId);

        // 紐付けられた全科目の出席記録を集約
        let allRecords = [];
        let totalClassesSum = 0;

        if (linkedSubjects.length > 1) {
            // 紐付けがある場合: 全科目の記録を合算
            linkedSubjects.forEach(s => {
                const records = Storage.getAttendanceBySubject(s.id);
                allRecords = allRecords.concat(records);
                totalClassesSum += s.totalClasses || 15;
            });
        } else {
            // 紐付けがない場合: 通常の計算
            allRecords = Storage.getAttendanceBySubject(subjectId);
            totalClassesSum = subject.totalClasses || 15;
        }

        // 各ステータスをカウント
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        let earlyCount = 0;

        allRecords.forEach(record => {
            switch (record.status) {
                case 'present':
                    presentCount++;
                    break;
                case 'absent':
                    absentCount++;
                    break;
                case 'late':
                    lateCount++;
                    break;
                case 'early':
                    earlyCount++;
                    break;
            }
        });

        // 遅刻・早退3回 = 1欠課
        const lateAbsences = Math.floor(lateCount / 3);
        const earlyAbsences = Math.floor(earlyCount / 3);

        // 総欠課数
        const totalAbsences = absentCount + lateAbsences + earlyAbsences;

        // 総授業回数（紐付け科目がある場合は合計）
        const totalClasses = totalClassesSum;

        // 記録された授業数
        const recordedClasses = allRecords.length;

        // 出席数（遅刻・早退は出席としてカウント、ただし3回まで）
        const attendedClasses = presentCount + lateCount + earlyCount;

        // 2/3ルールに基づく必要出席数
        const requiredAttendance = Math.ceil(totalClasses * (2 / 3));

        // 欠席上限（1/3まで）
        const maxAbsences = Math.floor(totalClasses / 3);

        // 残り必要出席数
        const remainingRequired = Math.max(0, requiredAttendance - attendedClasses);

        // 残り欠席可能回数
        const remainingAbsences = Math.max(0, maxAbsences - totalAbsences);

        // 出席率（記録された授業に対して）
        const attendanceRate = recordedClasses > 0
            ? Math.round((attendedClasses / recordedClasses) * 100)
            : 100;

        // 危険度判定
        let riskLevel = 'safe';
        if (remainingAbsences <= 0) {
            riskLevel = 'danger';
        } else if (remainingAbsences <= 3) {
            riskLevel = 'warning';
        }

        // 紐付け情報
        const isLinked = linkedSubjects.length > 1;
        const linkedCount = linkedSubjects.length;

        return {
            subjectId,
            subjectName: subject.name,
            color: subject.color || '#6366f1',
            totalClasses,
            recordedClasses,
            presentCount,
            absentCount,
            lateCount,
            earlyCount,
            lateAbsences,
            earlyAbsences,
            totalAbsences,
            attendedClasses,
            requiredAttendance,
            maxAbsences,
            remainingRequired,
            remainingAbsences,
            attendanceRate,
            riskLevel,
            isLinked,
            linkedCount
        };
    },

    /**
     * 全科目の統計を計算
     * @param {string} semester - 学期（'first' | 'second'）
     * @returns {array} 全科目の統計
     */
    calculateAllStats(semester) {
        const subjects = Storage.getSubjectsBySemester(semester);
        return subjects.map(subject => this.calculateStats(subject.id));
    },

    /**
     * 全体のサマリー統計を計算
     * @param {string} semester - 学期
     * @returns {object} サマリー統計
     */
    calculateSummary(semester) {
        const stats = this.calculateAllStats(semester);

        if (stats.length === 0) {
            return {
                totalSubjects: 0,
                averageAttendanceRate: 0,
                dangerCount: 0,
                warningCount: 0,
                safeCount: 0,
                totalAbsences: 0,
                totalAttended: 0
            };
        }

        const totalSubjects = stats.length;
        const averageAttendanceRate = Math.round(
            stats.reduce((sum, s) => sum + s.attendanceRate, 0) / totalSubjects
        );
        const dangerCount = stats.filter(s => s.riskLevel === 'danger').length;
        const warningCount = stats.filter(s => s.riskLevel === 'warning').length;
        const safeCount = stats.filter(s => s.riskLevel === 'safe').length;
        const totalAbsences = stats.reduce((sum, s) => sum + s.totalAbsences, 0);
        const totalAttended = stats.reduce((sum, s) => sum + s.attendedClasses, 0);

        return {
            totalSubjects,
            averageAttendanceRate,
            dangerCount,
            warningCount,
            safeCount,
            totalAbsences,
            totalAttended
        };
    },

    /**
     * 警告が必要な科目を取得
     * @param {string} semester - 学期
     * @param {number} threshold - 警告しきい値（残り欠席可能回数）
     * @returns {array} 警告対象の科目リスト
     */
    getAlertSubjects(semester, threshold = 3) {
        const stats = this.calculateAllStats(semester);
        return stats.filter(s => s.remainingAbsences <= threshold && s.recordedClasses > 0);
    },

    /**
     * 出席率から危険度を判定
     * @param {number} rate - 出席率
     * @returns {string} 危険度 ('safe' | 'warning' | 'danger')
     */
    getRiskLevelFromRate(rate) {
        if (rate >= 80) return 'safe';
        if (rate >= 67) return 'warning';
        return 'danger';
    },

    /**
     * プログレスバーの色を取得
     * @param {string} riskLevel - 危険度
     * @returns {string} CSS色
     */
    getProgressColor(riskLevel) {
        switch (riskLevel) {
            case 'danger':
                return '#ef4444';
            case 'warning':
                return '#f59e0b';
            default:
                return '#10b981';
        }
    },

    /**
     * 進捗率を計算（目標達成に向けて）
     * @param {object} stats - 科目の統計情報
     * @returns {number} 進捗率（0-100）
     */
    calculateProgress(stats) {
        if (stats.requiredAttendance === 0) return 100;
        const progress = (stats.attendedClasses / stats.requiredAttendance) * 100;
        return Math.min(100, Math.round(progress));
    }
};

// グローバルに公開
window.Calculator = Calculator;
