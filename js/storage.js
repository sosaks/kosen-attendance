/**
 * 高専 出席管理アプリ - ストレージモジュール
 * LocalStorageを使用したデータ永続化
 */

const Storage = {
    KEYS: {
        SUBJECTS: 'kosen_attendance_subjects',
        ATTENDANCE: 'kosen_attendance_records',
        SETTINGS: 'kosen_attendance_settings',
        SEMESTER: 'kosen_attendance_semester',
        SUPPLEMENTARY: 'kosen_attendance_supplementary'
    },

    /**
     * UUIDを生成
     */
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * データを取得
     */
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Storage get error:', e);
            return null;
        }
    },

    /**
     * データを保存
     */
    set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },

    /**
     * データを削除
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    },

    // ========== 科目関連 ==========

    /**
     * 全科目を取得
     */
    getSubjects() {
        return this.get(this.KEYS.SUBJECTS) || [];
    },

    /**
     * 科目を保存（全て）
     */
    saveSubjects(subjects) {
        return this.set(this.KEYS.SUBJECTS, subjects);
    },

    /**
     * 科目を追加
     */
    addSubject(subject) {
        const subjects = this.getSubjects();
        const newSubject = {
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            ...subject
        };
        subjects.push(newSubject);
        this.saveSubjects(subjects);
        return newSubject;
    },

    /**
     * 科目を更新
     */
    updateSubject(id, updates) {
        const subjects = this.getSubjects();
        const index = subjects.findIndex(s => s.id === id);
        if (index !== -1) {
            subjects[index] = { ...subjects[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveSubjects(subjects);
            return subjects[index];
        }
        return null;
    },

    /**
     * 科目を削除
     */
    deleteSubject(id) {
        const subjects = this.getSubjects();
        const filtered = subjects.filter(s => s.id !== id);
        this.saveSubjects(filtered);
        // 関連する出席記録も削除
        const attendance = this.getAttendance();
        const filteredAttendance = attendance.filter(a => a.subjectId !== id);
        this.saveAttendance(filteredAttendance);
        return true;
    },

    /**
     * IDで科目を取得
     */
    getSubjectById(id) {
        const subjects = this.getSubjects();
        return subjects.find(s => s.id === id) || null;
    },

    /**
     * 学期で科目をフィルタリング
     */
    getSubjectsBySemester(semester) {
        const subjects = this.getSubjects();
        return subjects.filter(s => s.semester === semester);
    },

    // ========== 出席記録関連 ==========

    /**
     * 全出席記録を取得
     */
    getAttendance() {
        return this.get(this.KEYS.ATTENDANCE) || [];
    },

    /**
     * 出席記録を保存（全て）
     */
    saveAttendance(attendance) {
        return this.set(this.KEYS.ATTENDANCE, attendance);
    },

    /**
     * 出席記録を追加/更新
     */
    setAttendanceRecord(subjectId, date, status) {
        const attendance = this.getAttendance();
        const existingIndex = attendance.findIndex(
            a => a.subjectId === subjectId && a.date === date
        );

        if (existingIndex !== -1) {
            // 更新
            attendance[existingIndex].status = status;
            attendance[existingIndex].updatedAt = new Date().toISOString();
        } else {
            // 新規追加
            attendance.push({
                id: this.generateId(),
                subjectId,
                date,
                status,
                createdAt: new Date().toISOString()
            });
        }

        this.saveAttendance(attendance);
        return true;
    },

    /**
     * 特定の科目の出席記録を取得
     */
    getAttendanceBySubject(subjectId) {
        const attendance = this.getAttendance();
        return attendance.filter(a => a.subjectId === subjectId);
    },

    /**
     * 特定の日付の出席記録を取得
     */
    getAttendanceByDate(date) {
        const attendance = this.getAttendance();
        return attendance.filter(a => a.date === date);
    },

    /**
     * 特定の科目・日付の出席記録を取得
     */
    getAttendanceRecord(subjectId, date) {
        const attendance = this.getAttendance();
        return attendance.find(a => a.subjectId === subjectId && a.date === date) || null;
    },

    /**
     * 出席記録を削除
     */
    deleteAttendanceRecord(id) {
        const attendance = this.getAttendance();
        const filtered = attendance.filter(a => a.id !== id);
        this.saveAttendance(filtered);
        return true;
    },

    // ========== 設定関連 ==========

    /**
     * 設定を取得
     */
    getSettings() {
        return this.get(this.KEYS.SETTINGS) || {
            notificationsEnabled: false,
            warningThreshold: 3,
            theme: 'dark'
        };
    },

    /**
     * 設定を保存
     */
    saveSettings(settings) {
        return this.set(this.KEYS.SETTINGS, settings);
    },

    /**
     * 現在の学期を取得
     */
    getCurrentSemester() {
        return this.get(this.KEYS.SEMESTER) || 'first';
    },

    /**
     * 現在の学期を設定
     */
    setCurrentSemester(semester) {
        return this.set(this.KEYS.SEMESTER, semester);
    },

    // ========== 科目紐付け関連 ==========

    /**
     * 紐付けられた科目グループを取得（親科目IDをキーにした全ての関連科目）
     * @param {string} subjectId - 科目ID（親でも子でも可）
     * @returns {array} 紐付けられた科目の配列（親科目を含む）
     */
    getLinkedSubjects(subjectId) {
        const subjects = this.getSubjects();
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return [];

        // 親科目IDを特定（自身がlinkedSubjectIdを持っていればそれが親、なければ自身が親）
        const rootId = subject.linkedSubjectId || subject.id;

        // 親科目と、親科目に紐付けられた全ての子科目を取得
        return subjects.filter(s => s.id === rootId || s.linkedSubjectId === rootId);
    },

    /**
     * 親科目を取得
     * @param {string} subjectId - 科目ID
     * @returns {object|null} 親科目オブジェクト
     */
    getRootSubject(subjectId) {
        const subject = this.getSubjectById(subjectId);
        if (!subject) return null;

        if (subject.linkedSubjectId) {
            return this.getSubjectById(subject.linkedSubjectId);
        }
        return subject;
    },

    /**
     * 紐付け可能な既存科目を取得
     * @param {string} semester - 学期
     * @param {string} excludeId - 除外する科目ID（編集中の科目）
     * @param {boolean} includeOtherSemester - 通年科目用に別学期も含めるか
     * @returns {array} 紐付け可能な科目の配列
     */
    getAvailableSubjectsForLinking(semester, excludeId = null, includeOtherSemester = false) {
        let subjects;
        if (includeOtherSemester && semester === 'second') {
            // 後期の場合、前期の科目も含める（通年科目用）
            subjects = this.getSubjects().filter(s =>
                s.semester === semester || s.semester === 'first'
            );
        } else {
            subjects = this.getSubjectsBySemester(semester);
        }
        // 子科目でない（linkedSubjectIdがnull/undefined）かつ、自身でない科目
        return subjects.filter(s => !s.linkedSubjectId && s.id !== excludeId);
    },

    // ========== 補講関連 ==========

    /**
     * 全補講を取得
     */
    getSupplementaryClasses() {
        return this.get(this.KEYS.SUPPLEMENTARY) || [];
    },

    /**
     * 補講を保存（全て）
     */
    saveSupplementaryClasses(classes) {
        return this.set(this.KEYS.SUPPLEMENTARY, classes);
    },

    /**
     * 補講を追加
     * @param {object} suppClass - 補講データ {date, dayOfWeek, period, subjectId, semester}
     */
    addSupplementaryClass(suppClass) {
        const classes = this.getSupplementaryClasses();
        const newClass = {
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            ...suppClass
        };
        classes.push(newClass);
        this.saveSupplementaryClasses(classes);
        return newClass;
    },

    /**
     * 補講を削除
     * @param {string} id - 補講ID
     */
    deleteSupplementaryClass(id) {
        const classes = this.getSupplementaryClasses();
        const filtered = classes.filter(c => c.id !== id);
        this.saveSupplementaryClasses(filtered);
        return true;
    },

    /**
     * 特定の日付・曜日・時限の補講を取得
     * @param {string} date - 日付 (YYYY-MM-DD)
     * @param {number} dayOfWeek - 曜日 (0-4)
     * @param {number} period - 時限 (1-4)
     * @returns {object|null} 補講データ
     */
    getSupplementaryClassForSlot(date, dayOfWeek, period) {
        const classes = this.getSupplementaryClasses();
        const semester = this.getCurrentSemester();
        return classes.find(c =>
            c.date === date &&
            c.dayOfWeek === dayOfWeek &&
            c.period === period &&
            c.semester === semester
        ) || null;
    },

    /**
     * 学期の補講を取得
     * @param {string} semester - 学期
     * @returns {array} 補講リスト
     */
    getSupplementaryClassesBySemester(semester) {
        const classes = this.getSupplementaryClasses();
        return classes.filter(c => c.semester === semester);
    },

    // ========== エクスポート/インポート ==========

    /**
     * 全データをエクスポート
     */
    exportData() {
        return {
            subjects: this.getSubjects(),
            attendance: this.getAttendance(),
            settings: this.getSettings(),
            semester: this.getCurrentSemester(),
            exportedAt: new Date().toISOString()
        };
    },

    /**
     * データをインポート
     */
    importData(data) {
        try {
            if (data.subjects) this.saveSubjects(data.subjects);
            if (data.attendance) this.saveAttendance(data.attendance);
            if (data.settings) this.saveSettings(data.settings);
            if (data.semester) this.setCurrentSemester(data.semester);
            return true;
        } catch (e) {
            console.error('Import error:', e);
            return false;
        }
    },

    /**
     * 全データをクリア
     */
    clearAllData() {
        Object.values(this.KEYS).forEach(key => this.remove(key));
        return true;
    }
};

// グローバルに公開
window.Storage = Storage;
