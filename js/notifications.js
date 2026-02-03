/**
 * 沖縄高専 出席管理アプリ - 通知モジュール
 * Web Notifications APIを使用した通知
 */

const Notifications = {
    /**
     * 初期化
     */
    init() {
        this.setupPermission();
    },

    /**
     * 通知権限を設定
     */
    async setupPermission() {
        if (!('Notification' in window)) {
            console.log('このブラウザは通知をサポートしていません');
            return;
        }

        if (Notification.permission === 'default') {
            // 設定ページで許可を求める
            console.log('通知権限が未設定です');
        }
    },

    /**
     * 通知権限をリクエスト
     */
    async requestPermission() {
        if (!('Notification' in window)) {
            App.showToast('このブラウザは通知をサポートしていません', 'error');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                App.showToast('通知が有効になりました', 'success');
                return true;
            } else {
                App.showToast('通知が拒否されました', 'error');
                return false;
            }
        } catch (e) {
            console.error('通知権限のリクエストに失敗:', e);
            return false;
        }
    },

    /**
     * 通知を送信
     * @param {string} title - タイトル
     * @param {object} options - オプション
     */
    send(title, options = {}) {
        const settings = Storage.getSettings();
        if (!settings.notificationsEnabled) return;

        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        const notification = new Notification(title, {
            icon: '📚',
            badge: '📚',
            ...options
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // 5秒後に自動で閉じる
        setTimeout(() => notification.close(), 5000);
    },

    /**
     * アラートをチェックして通知
     */
    checkAlerts() {
        const settings = Storage.getSettings();
        if (!settings.notificationsEnabled) return;

        const semester = Storage.getCurrentSemester();
        const alertSubjects = Calculator.getAlertSubjects(semester, settings.warningThreshold);

        alertSubjects.forEach(stats => {
            if (stats.remainingAbsences <= 0) {
                this.send('🚨 出席警告', {
                    body: `${stats.subjectName}の欠席上限に達しました！これ以上欠席すると単位が取得できません。`,
                    tag: `danger-${stats.subjectId}`,
                    requireInteraction: true
                });
            } else if (stats.remainingAbsences <= settings.warningThreshold) {
                this.send('⚠️ 出席注意', {
                    body: `${stats.subjectName}の残り欠席可能回数: ${stats.remainingAbsences}回`,
                    tag: `warning-${stats.subjectId}`
                });
            }
        });
    }
};

// グローバルに公開
window.Notifications = Notifications;
