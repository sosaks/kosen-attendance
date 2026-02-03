/**
 * 沖縄高専 出席管理アプリ - 時間割モジュール
 * 時間割の作成・編集・表示
 */

const Schedule = {
    // 時限の時間帯
    PERIODS: {
        1: { start: '08:50', end: '10:20' },
        2: { start: '10:30', end: '12:00' },
        3: { start: '13:00', end: '14:30' },
        4: { start: '14:40', end: '16:10' }
    },

    // 曜日
    DAYS: ['月', '火', '水', '木', '金'],

    /**
     * 時間割グリッドを初期化
     */
    init() {
        this.renderScheduleGrid();
        this.setupEventListeners();
    },

    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // 科目追加ボタン
        const addBtn = document.getElementById('addSubjectBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openSubjectModal());
        }

        // モーダルのクローズボタン
        const closeBtn = document.getElementById('closeSubjectModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSubjectModal());
        }

        // キャンセルボタン
        const cancelBtn = document.getElementById('cancelSubjectBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeSubjectModal());
        }

        // フォーム送信
        const form = document.getElementById('subjectForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // モーダルオーバーレイクリックで閉じる
        const overlay = document.getElementById('subjectModal');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeSubjectModal();
                }
            });
        }

        // 削除ボタン
        const deleteBtn = document.getElementById('deleteSubjectBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                const id = document.getElementById('subjectId').value;
                if (id) {
                    this.deleteSubject(id);
                }
            });
        }
    },

    /**
     * 時間割グリッドをレンダリング
     */
    renderScheduleGrid() {
        const scheduleBody = document.getElementById('scheduleBody');
        if (!scheduleBody) return;

        const semester = Storage.getCurrentSemester();
        const subjects = Storage.getSubjectsBySemester(semester);

        let html = '';

        // 各時限をループ
        for (let period = 1; period <= 4; period++) {
            html += `<div class="schedule-row">`;

            // 時限セル
            html += `
        <div class="period-cell">
          ${period}限
          <div class="period-time">${this.PERIODS[period].start}<br>${this.PERIODS[period].end}</div>
        </div>
      `;

            // 各曜日をループ
            for (let day = 0; day < 5; day++) {
                const subject = subjects.find(s => s.dayOfWeek === day && s.period === period);

                if (subject) {
                    const stats = Calculator.calculateStats(subject.id);
                    const bgColor = subject.color || '#6366f1';
                    html += `
            <div class="class-cell">
              <div class="class-item" style="background: ${bgColor}20; border: 1px solid ${bgColor}50;" 
                   onclick="Schedule.editSubject('${subject.id}')">
                <div class="class-name">${subject.name}</div>
                <div class="class-info">
                  出席: ${stats.attendedClasses}/${stats.totalClasses}
                </div>
              </div>
            </div>
          `;
                } else {
                    html += `
            <div class="class-cell empty" onclick="Schedule.openSubjectModal(${day}, ${period})">
            </div>
          `;
                }
            }

            html += `</div>`;
        }

        scheduleBody.innerHTML = html;
    },

    /**
     * 科目追加モーダルを開く
     * @param {number} day - 曜日（0-4）
     * @param {number} period - 時限（1-4）
     */
    openSubjectModal(day = 0, period = 1) {
        const modal = document.getElementById('subjectModal');
        const title = document.getElementById('subjectModalTitle');
        const form = document.getElementById('subjectForm');

        if (!modal || !form) return;

        // フォームをリセット
        form.reset();
        document.getElementById('subjectId').value = '';
        document.getElementById('subjectDay').value = day;
        document.getElementById('subjectPeriod').value = period;
        document.getElementById('subjectColor').value = '#6366f1';

        // 削除ボタンを非表示（新規追加時）
        const deleteBtn = document.getElementById('deleteSubjectBtn');
        if (deleteBtn) deleteBtn.style.display = 'none';

        title.textContent = '科目を追加';
        modal.classList.add('active');
    },

    /**
     * 科目編集モーダルを開く
     * @param {string} id - 科目ID
     */
    editSubject(id) {
        const subject = Storage.getSubjectById(id);
        if (!subject) return;

        const modal = document.getElementById('subjectModal');
        const title = document.getElementById('subjectModalTitle');

        if (!modal) return;

        // フォームに値を設定
        document.getElementById('subjectId').value = subject.id;
        document.getElementById('subjectName').value = subject.name;
        document.getElementById('subjectDay').value = subject.dayOfWeek;
        document.getElementById('subjectPeriod').value = subject.period;
        document.getElementById('totalClasses').value = subject.totalClasses;
        document.getElementById('subjectColor').value = subject.color || '#6366f1';

        // 削除ボタンを表示（編集時）
        const deleteBtn = document.getElementById('deleteSubjectBtn');
        if (deleteBtn) deleteBtn.style.display = 'block';

        title.textContent = '科目を編集';
        modal.classList.add('active');
    },

    /**
     * 科目モーダルを閉じる
     */
    closeSubjectModal() {
        const modal = document.getElementById('subjectModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    /**
     * フォーム送信を処理
     * @param {Event} e - イベント
     */
    handleFormSubmit(e) {
        e.preventDefault();

        const id = document.getElementById('subjectId').value;
        const name = document.getElementById('subjectName').value.trim();
        const dayOfWeek = parseInt(document.getElementById('subjectDay').value);
        const period = parseInt(document.getElementById('subjectPeriod').value);
        const totalClasses = parseInt(document.getElementById('totalClasses').value);
        const color = document.getElementById('subjectColor').value;
        const semester = Storage.getCurrentSemester();

        if (!name) {
            App.showToast('科目名を入力してください', 'error');
            return;
        }

        // 同じ曜日・時限に既に科目があるかチェック（編集時は自分自身を除外）
        const subjects = Storage.getSubjectsBySemester(semester);
        const conflict = subjects.find(s =>
            s.dayOfWeek === dayOfWeek &&
            s.period === period &&
            s.id !== id
        );

        if (conflict) {
            App.showToast('この曜日・時限には既に科目が登録されています', 'error');
            return;
        }

        const subjectData = {
            name,
            dayOfWeek,
            period,
            totalClasses,
            color,
            semester
        };

        if (id) {
            // 更新
            Storage.updateSubject(id, subjectData);
            App.showToast('科目を更新しました', 'success');
        } else {
            // 新規追加
            Storage.addSubject(subjectData);
            App.showToast('科目を追加しました', 'success');
        }

        this.closeSubjectModal();
        this.renderScheduleGrid();

        // ダッシュボードも更新
        if (window.Dashboard) {
            Dashboard.render();
        }
    },

    /**
     * 科目を削除
     * @param {string} id - 科目ID
     */
    deleteSubject(id) {
        App.showConfirm(
            '科目を削除',
            'この科目と関連する出席記録を全て削除しますか？この操作は取り消せません。',
            () => {
                Storage.deleteSubject(id);
                this.closeSubjectModal();
                this.renderScheduleGrid();
                if (window.Dashboard) {
                    Dashboard.render();
                }
                App.showToast('科目を削除しました', 'success');
            }
        );
    },

    /**
     * 特定の日付の授業を取得
     * @param {Date} date - 日付
     * @returns {array} 授業リスト
     */
    getClassesForDate(date) {
        const dayOfWeek = date.getDay() - 1; // 0=月, 1=火, ...
        if (dayOfWeek < 0 || dayOfWeek > 4) return []; // 土日は空

        const semester = Storage.getCurrentSemester();
        const subjects = Storage.getSubjectsBySemester(semester);

        return subjects
            .filter(s => s.dayOfWeek === dayOfWeek)
            .sort((a, b) => a.period - b.period);
    }
};

// グローバルに公開
window.Schedule = Schedule;
