/**
 * 出席管理アプリ - モード設定モジュール
 * 学校タイプ別の時間割・ルール設定を管理
 */

const ModeConfig = {
    // プリセット設定
    PRESETS: {
        kosen: {
            name: '高専',
            description: '4限制（1限90分）',
            periodCount: 4,
            periods: {
                1: { start: '08:50', end: '10:20' },
                2: { start: '10:30', end: '12:00' },
                3: { start: '13:00', end: '14:30' },
                4: { start: '14:40', end: '16:10' }
            },
            lateToAbsent: 3,  // 3遅刻=1欠席
            earlyToAbsent: 3,  // 3早退=1欠席
            attendanceDenominator: 3 // 授業数の1/3以上で欠席
        },
        custom: {
            name: 'カスタム',
            description: '自由に設定',
            periodCount: 6,
            periods: {
                1: { start: '08:30', end: '09:20' },
                2: { start: '09:30', end: '10:20' },
                3: { start: '10:30', end: '11:20' },
                4: { start: '11:30', end: '12:20' },
                5: { start: '13:10', end: '14:00' },
                6: { start: '14:10', end: '15:00' },
                7: { start: '15:10', end: '16:00' },
                8: { start: '16:10', end: '17:00' }
            },
            lateToAbsent: 3,
            earlyToAbsent: 3,
            attendanceDenominator: 3
        }
    },

    /**
     * 現在のモード設定を取得
     * @returns {object} モード設定
     */
    getCurrentConfig() {
        const saved = Storage.get('kosen_attendance_mode_config');
        if (saved) {
            return saved;
        }
        // デフォルトは高専モード
        return { ...this.PRESETS.kosen, mode: 'kosen' };
    },

    /**
     * モード設定を保存
     * @param {object} config - モード設定
     */
    saveConfig(config) {
        Storage.set('kosen_attendance_mode_config', config);
    },

    /**
     * プリセットを適用
     * @param {string} presetName - プリセット名 ('kosen' | 'highschool' | 'custom')
     */
    applyPreset(presetName) {
        const preset = this.PRESETS[presetName];
        if (preset) {
            const config = { ...preset, mode: presetName };
            this.saveConfig(config);
            return config;
        }
        return null;
    },

    /**
     * 現在の時限数を取得
     * @returns {number} 時限数
     */
    getPeriodCount() {
        return this.getCurrentConfig().periodCount;
    },

    /**
     * 時限情報を取得
     * @returns {object} 時限情報
     */
    getPeriods() {
        const config = this.getCurrentConfig();
        const periods = {};
        for (let i = 1; i <= config.periodCount; i++) {
            periods[i] = config.periods[i] || { start: '00:00', end: '00:00' };
        }
        return periods;
    },

    /**
     * 遅刻→欠席変換回数を取得
     * @returns {number} 遅刻何回で1欠席
     */
    getLateToAbsent() {
        return this.getCurrentConfig().lateToAbsent || 3;
    },

    /**
     * 早退→欠席変換回数を取得
     * @returns {number} 早退何回で1欠席
     */
    getEarlyToAbsent() {
        return this.getCurrentConfig().earlyToAbsent || 3;
    },
    /**
     * 欠席許容割合の分母を取得
     * @returns {number} 分母 (例: 3なら1/3)
     */
    getAttendanceDenominator() {
        return this.getCurrentConfig().attendanceDenominator || 3;
    },

    /**
     * カスタム設定を更新
     * @param {object} updates - 更新内容
     */
    updateCustomConfig(updates) {
        const current = this.getCurrentConfig();
        const updated = { ...current, ...updates, mode: 'custom' };
        this.saveConfig(updated);
        return updated;
    },

    /**
     * 時限の時間帯を更新
     * @param {number} period - 時限番号
     * @param {string} start - 開始時刻 (HH:MM)
     * @param {string} end - 終了時刻 (HH:MM)
     */
    updatePeriodTime(period, start, end) {
        const current = this.getCurrentConfig();
        current.periods[period] = { start, end };
        current.mode = 'custom';
        this.saveConfig(current);
    },

    /**
     * 設定をUIに反映するためのヘルパー
     * @returns {array} 時限オプションの配列
     */
    getPeriodOptions() {
        const count = this.getPeriodCount();
        const options = [];
        for (let i = 1; i <= count; i++) {
            options.push({ value: i, label: `${i}限` });
        }
        return options;
    }
};

// グローバルに公開
window.ModeConfig = ModeConfig;
