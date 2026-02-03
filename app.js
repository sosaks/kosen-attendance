/**
 * 沖縄高専 出席管理アプリ - メインアプリケーション
 */

const App = {
    currentPage: 'dashboard',

    /**
     * アプリケーションを初期化
     */
    init() {
        this.setupNavigation();
        this.setupSemesterSelector();
        this.setupMobileMenu();
        this.setupSettings();
        this.setupDataManagement();
        this.setupConfirmModal();

        // 各モジュールを初期化
        Schedule.init();
        Attendance.init();
        Dashboard.init();
        Notifications.init();

        console.log('高専 出席管理アプリが起動しました');
    },

    /**
     * ナビゲーションを設定
     */
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.navigateTo(page);

                // モバイルメニューを閉じる
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.remove('open');
                }
            });
        });
    },

    /**
     * ページ遷移
     * @param {string} pageName - ページ名
     */
    navigateTo(pageName) {
        // ナビゲーションのアクティブ状態を更新
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === pageName);
        });

        // ページの表示を切り替え
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        const targetPage = document.getElementById(`${pageName}Page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        this.currentPage = pageName;

        // ページ固有のレンダリング
        switch (pageName) {
            case 'dashboard':
                Dashboard.render();
                break;
            case 'schedule':
                Schedule.renderScheduleGrid();
                break;
            case 'attendance':
                Attendance.render();
                break;
        }
    },

    /**
     * 学期セレクターを設定
     */
    setupSemesterSelector() {
        const selector = document.getElementById('semesterSelect');
        if (!selector) return;

        // 現在の学期を設定
        selector.value = Storage.getCurrentSemester();

        selector.addEventListener('change', () => {
            Storage.setCurrentSemester(selector.value);

            // 各モジュールを更新
            Schedule.renderScheduleGrid();
            Dashboard.render();
            Attendance.render();

            const semesterName = selector.value === 'first' ? '前期' : '後期';
            this.showToast(`${semesterName}に切り替えました`, 'success');
        });
    },

    /**
     * モバイルメニューを設定
     */
    setupMobileMenu() {
        const toggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');

        if (!toggle || !sidebar) return;

        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // サイドバー外をクリックで閉じる
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        });
    },

    /**
     * 設定を設定
     */
    setupSettings() {
        const settings = Storage.getSettings();

        // 通知トグル
        const notificationToggle = document.getElementById('notificationToggle');
        if (notificationToggle) {
            notificationToggle.checked = settings.notificationsEnabled;

            notificationToggle.addEventListener('change', async () => {
                if (notificationToggle.checked) {
                    const granted = await Notifications.requestPermission();
                    if (granted) {
                        settings.notificationsEnabled = true;
                        Storage.saveSettings(settings);
                    } else {
                        notificationToggle.checked = false;
                    }
                } else {
                    settings.notificationsEnabled = false;
                    Storage.saveSettings(settings);
                    this.showToast('通知を無効にしました', 'success');
                }
            });
        }

        // 警告しきい値
        const thresholdInput = document.getElementById('warningThreshold');
        if (thresholdInput) {
            thresholdInput.value = settings.warningThreshold;

            thresholdInput.addEventListener('change', () => {
                settings.warningThreshold = parseInt(thresholdInput.value) || 3;
                Storage.saveSettings(settings);
                Dashboard.renderAlerts();
                this.showToast('設定を保存しました', 'success');
            });
        }
    },

    /**
     * データ管理を設定
     */
    setupDataManagement() {
        // エクスポート
        const exportBtn = document.getElementById('exportDataBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        // インポート
        const importBtn = document.getElementById('importDataBtn');
        const importInput = document.getElementById('importDataInput');
        if (importBtn && importInput) {
            importBtn.addEventListener('click', () => importInput.click());
            importInput.addEventListener('change', (e) => this.importData(e));
        }

        // 全削除
        const clearBtn = document.getElementById('clearDataBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.showConfirm(
                    'データを削除',
                    '全ての科目と出席記録を削除しますか？この操作は取り消せません。',
                    () => {
                        Storage.clearAllData();
                        Schedule.renderScheduleGrid();
                        Dashboard.render();
                        Attendance.render();
                        this.showToast('全データを削除しました', 'success');
                    }
                );
            });
        }
    },

    /**
     * データをエクスポート
     */
    exportData() {
        const data = Storage.exportData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `okinawa-kosen-attendance-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('データをエクスポートしました', 'success');
    },

    /**
     * データをインポート
     * @param {Event} e - イベント
     */
    importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                Storage.importData(data);
                Schedule.renderScheduleGrid();
                Dashboard.render();
                Attendance.render();
                this.showToast('データをインポートしました', 'success');
            } catch (err) {
                console.error('Import error:', err);
                this.showToast('インポートに失敗しました', 'error');
            }
        };
        reader.readAsText(file);

        // 入力をリセット
        e.target.value = '';
    },

    /**
     * 確認モーダルを設定
     */
    setupConfirmModal() {
        const cancelBtn = document.getElementById('confirmCancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideConfirm());
        }
    },

    /**
     * 確認モーダルを表示
     * @param {string} title - タイトル
     * @param {string} message - メッセージ
     * @param {function} onConfirm - 確認時のコールバック
     */
    showConfirm(title, message, onConfirm) {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmModalTitle');
        const messageEl = document.getElementById('confirmModalMessage');
        const okBtn = document.getElementById('confirmOkBtn');

        if (!modal) return;

        titleEl.textContent = title;
        messageEl.textContent = message;
        modal.classList.add('active');

        // 既存のリスナーを削除して新しいリスナーを追加
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);

        newOkBtn.addEventListener('click', () => {
            this.hideConfirm();
            onConfirm();
        });
    },

    /**
     * 確認モーダルを非表示
     */
    hideConfirm() {
        const modal = document.getElementById('confirmModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    /**
     * トースト通知を表示
     * @param {string} message - メッセージ
     * @param {string} type - タイプ ('success' | 'error' | 'warning')
     */
    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span class="toast-message">${message}</span>
    `;

        container.appendChild(toast);

        // 3秒後に削除
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// グローバルに公開
window.App = App;
