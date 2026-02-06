/**
 * 沖縄高専 出席管理アプリ - 時間割モジュール
 * 時間割の作成・編集・表示
 */

const Schedule = {
    /**
     * 時限の時間帯を取得（ModeConfigから動的取得）
     */
    getPeriods() {
        if (window.ModeConfig) {
            return ModeConfig.getPeriods();
        }
        // フォールバック（高専デフォルト）
        return {
            1: { start: '08:50', end: '10:20' },
            2: { start: '10:30', end: '12:00' },
            3: { start: '13:00', end: '14:30' },
            4: { start: '14:40', end: '16:10' }
        };
    },

    /**
     * 時限数を取得
     */
    getPeriodCount() {
        if (window.ModeConfig) {
            return ModeConfig.getPeriodCount();
        }
        return 4; // フォールバック
    },

    // 曜日
    DAYS: ['月', '火', '水', '木', '金'],

    /**
     * 時間割グリッドを初期化
     */
    init() {
        this.renderScheduleGrid();
        this.renderSupplementaryList();
        this.setupEventListeners();
    },

    /**
     * 時限ドロップダウンを生成
     * @param {string} elementId - select要素のID
     * @param {number} selectedValue - 選択する値
     */
    populatePeriodDropdown(elementId, selectedValue = 1) {
        const select = document.getElementById(elementId);
        if (!select) return;

        const count = this.getPeriodCount();
        select.innerHTML = '';

        for (let i = 1; i <= count; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i}限`;
            if (i === parseInt(selectedValue)) {
                option.selected = true;
            }
            select.appendChild(option);
        }
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

        // FAB科目追加ボタン
        const fabBtn = document.getElementById('fabAddSubject');
        if (fabBtn) {
            fabBtn.addEventListener('click', () => this.openSubjectModal());
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

        // 補講追加ボタン
        const addSuppBtn = document.getElementById('addSupplementaryBtn');
        if (addSuppBtn) {
            addSuppBtn.addEventListener('click', () => this.openSupplementaryModal());
        }

        // 補講モーダルのクローズボタン
        const closeSuppBtn = document.getElementById('closeSupplementaryModal');
        if (closeSuppBtn) {
            closeSuppBtn.addEventListener('click', () => this.closeSupplementaryModal());
        }

        // 補講キャンセルボタン
        const cancelSuppBtn = document.getElementById('cancelSupplementaryBtn');
        if (cancelSuppBtn) {
            cancelSuppBtn.addEventListener('click', () => this.closeSupplementaryModal());
        }

        // 補講フォーム送信
        const suppForm = document.getElementById('supplementaryForm');
        if (suppForm) {
            suppForm.addEventListener('submit', (e) => this.handleSupplementarySubmit(e));
        }

        // 補講モーダルオーバーレイクリックで閉じる
        const suppOverlay = document.getElementById('supplementaryModal');
        if (suppOverlay) {
            suppOverlay.addEventListener('click', (e) => {
                if (e.target === suppOverlay) {
                    this.closeSupplementaryModal();
                }
            });
        }

        // 日付変更時に曜日を自動設定
        const suppDateInput = document.getElementById('suppDate');
        if (suppDateInput) {
            suppDateInput.addEventListener('change', () => {
                const date = new Date(suppDateInput.value);
                const dayOfWeek = date.getDay() - 1; // 0=月, 1=火, ...
                if (dayOfWeek >= 0 && dayOfWeek <= 4) {
                    document.getElementById('suppDay').value = dayOfWeek;
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

        const periods = this.getPeriods();
        const periodCount = this.getPeriodCount();

        // 各時限をループ
        for (let period = 1; period <= periodCount; period++) {
            const periodInfo = periods[period] || { start: '00:00', end: '00:00' };
            html += `<div class="schedule-row">`;

            // 時限セル
            html += `
        <div class="period-cell">
          ${period}限
          <div class="period-time">${periodInfo.start}<br>${periodInfo.end}</div>
        </div>
      `;

            // 各曜日をループ
            for (let day = 0; day < 5; day++) {
                const subject = subjects.find(s => s.dayOfWeek === day && s.period === period);

                if (subject) {
                    const stats = Calculator.calculateStats(subject.id);
                    const bgColor = subject.color || '#6366f1';
                    const linkedIcon = stats.isLinked ? '<span class="linked-badge" title="紐付け済み">🔗</span>' : '';
                    html += `
            <div class="class-cell">
              <div class="class-item" style="background: ${bgColor}20; border: 1px solid ${bgColor}50;" 
                   onclick="Schedule.editSubject('${subject.id}')">
                <div class="class-name">${linkedIcon}${subject.name}</div>
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

        // 時限選択肢を更新
        this.populatePeriodDropdown('subjectPeriod', period);

        // フォームをリセット
        form.reset();
        document.getElementById('subjectId').value = '';
        document.getElementById('subjectDay').value = day;
        document.getElementById('subjectPeriod').value = period; // リセット後に再設定
        document.getElementById('subjectColor').value = '#6366f1';

        // 紐付け科目ドロップダウンを初期化
        this.populateLinkingDropdown(null);

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

        // 時限選択肢を更新
        this.populatePeriodDropdown('subjectPeriod', subject.period);
        document.getElementById('subjectPeriod').value = subject.period;
        document.getElementById('totalClasses').value = subject.totalClasses;
        document.getElementById('subjectColor').value = subject.color || '#6366f1';

        // 紐付け科目ドロップダウンを初期化
        this.populateLinkingDropdown(subject.id);
        // 既存の紐付けを反映
        document.getElementById('linkedSubject').value = subject.linkedSubjectId || '';

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

        const linkedSubjectId = document.getElementById('linkedSubject').value || null;

        const subjectData = {
            name,
            dayOfWeek,
            period,
            totalClasses,
            color,
            semester,
            linkedSubjectId
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
     * 特定の日付の授業を取得（補講を考慮）
     * @param {Date} date - 日付
     * @returns {array} 授業リスト（補講がある場合は置き換え、isSupplementaryフラグ付き）
     */
    getClassesForDate(date) {
        const dayOfWeek = date.getDay() - 1; // 0=月, 1=火, ...
        if (dayOfWeek < 0 || dayOfWeek > 4) return []; // 土日は空

        const dateStr = date.toISOString().split('T')[0];
        const semester = Storage.getCurrentSemester();
        const subjects = Storage.getSubjectsBySemester(semester);

        // 全時限のスロットをチェック
        const periodCount = this.getPeriodCount();
        const classes = [];
        for (let period = 1; period <= periodCount; period++) {
            // この時限の補講をチェック
            const supplementary = Storage.getSupplementaryClassForSlot(dateStr, dayOfWeek, period);

            if (supplementary) {
                // 補講がある場合、補講の科目を取得
                const suppSubject = Storage.getSubjectById(supplementary.subjectId);
                if (suppSubject) {
                    classes.push({
                        ...suppSubject,
                        period: period,
                        dayOfWeek: dayOfWeek,
                        isSupplementary: true,
                        supplementaryId: supplementary.id
                    });
                }
            } else {
                // 補講がない場合、通常の授業
                const regularSubject = subjects.find(s => s.dayOfWeek === dayOfWeek && s.period === period);
                if (regularSubject) {
                    classes.push({
                        ...regularSubject,
                        isSupplementary: false
                    });
                }
            }
        }

        return classes.sort((a, b) => a.period - b.period);
    },

    /**
     * 紐付け科目ドロップダウンを初期化
     * @param {string|null} excludeId - 除外する科目ID（編集中の科目）
     */
    populateLinkingDropdown(excludeId) {
        const dropdown = document.getElementById('linkedSubject');
        if (!dropdown) return;

        const semester = Storage.getCurrentSemester();
        // 後期の場合は前期科目も含める（通年科目用）
        const includeOtherSemester = semester === 'second';
        const availableSubjects = Storage.getAvailableSubjectsForLinking(semester, excludeId, includeOtherSemester);

        // ドロップダウンをリセット
        dropdown.innerHTML = '<option value="">紐付けなし（新規科目）</option>';

        // 紐付け可能な科目を追加
        availableSubjects.forEach(subject => {
            const dayName = this.DAYS[subject.dayOfWeek];
            const semesterLabel = subject.semester !== semester ? '【前期】' : '';
            const option = document.createElement('option');
            option.value = subject.id;
            option.textContent = `${semesterLabel}${subject.name}（${dayName}${subject.period}限）`;
            dropdown.appendChild(option);
        });
    },

    // ========== 補講関連 ==========

    /**
     * 補講モーダルを開く
     */
    openSupplementaryModal() {
        const modal = document.getElementById('supplementaryModal');
        const form = document.getElementById('supplementaryForm');
        if (!modal || !form) return;

        // フォームをリセット
        form.reset();

        // 今日の日付をデフォルトに
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('suppDate').value = today;

        // 時限ドロップダウンを初期化
        this.populatePeriodDropdown('suppPeriod', 1);

        // 科目ドロップダウンを初期化
        this.populateSupplementarySubjectDropdown();

        modal.classList.add('active');
    },

    /**
     * 補講モーダルを閉じる
     */
    closeSupplementaryModal() {
        const modal = document.getElementById('supplementaryModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    /**
     * 補講の科目ドロップダウンを初期化
     */
    populateSupplementarySubjectDropdown() {
        const dropdown = document.getElementById('suppSubject');
        if (!dropdown) return;

        const semester = Storage.getCurrentSemester();
        const subjects = Storage.getSubjectsBySemester(semester);

        dropdown.innerHTML = '';

        if (subjects.length === 0) {
            dropdown.innerHTML = '<option value="">科目がありません</option>';
            return;
        }

        subjects.forEach(subject => {
            const dayName = this.DAYS[subject.dayOfWeek];
            const option = document.createElement('option');
            option.value = subject.id;
            option.textContent = `${subject.name}（${dayName}${subject.period}限）`;
            dropdown.appendChild(option);
        });
    },

    /**
     * 補講フォームを処理
     * @param {Event} e - イベント
     */
    handleSupplementarySubmit(e) {
        e.preventDefault();

        const date = document.getElementById('suppDate').value;
        const dayOfWeek = parseInt(document.getElementById('suppDay').value);
        const period = parseInt(document.getElementById('suppPeriod').value);
        const subjectId = document.getElementById('suppSubject').value;
        const semester = Storage.getCurrentSemester();

        if (!date || !subjectId) {
            App.showToast('日付と科目を選択してください', 'error');
            return;
        }

        // 同じ日付・時限に既に補講があるかチェック
        const existing = Storage.getSupplementaryClassForSlot(date, dayOfWeek, period);
        if (existing) {
            App.showToast('この日時には既に補講が登録されています', 'error');
            return;
        }

        // 補講を追加
        Storage.addSupplementaryClass({
            date,
            dayOfWeek,
            period,
            subjectId,
            semester
        });

        App.showToast('補講を追加しました', 'success');
        this.closeSupplementaryModal();
        this.renderSupplementaryList();
    },

    /**
     * 補講を削除
     * @param {string} id - 補講ID
     */
    deleteSupplementary(id) {
        App.showConfirm(
            '補講を削除',
            'この補講を削除しますか？',
            () => {
                Storage.deleteSupplementaryClass(id);
                this.renderSupplementaryList();
                App.showToast('補講を削除しました', 'success');
            }
        );
    },

    /**
     * 補講一覧をレンダリング
     */
    renderSupplementaryList() {
        const container = document.getElementById('supplementaryList');
        const card = document.getElementById('supplementaryListCard');
        if (!container) return;

        const semester = Storage.getCurrentSemester();
        const supplementaries = Storage.getSupplementaryClassesBySemester(semester);

        if (supplementaries.length === 0) {
            if (card) card.style.display = 'none';
            return;
        }

        if (card) card.style.display = 'block';

        // 日付でソート
        const sorted = [...supplementaries].sort((a, b) => new Date(a.date) - new Date(b.date));

        let html = '';
        sorted.forEach(supp => {
            const subject = Storage.getSubjectById(supp.subjectId);
            if (!subject) return;

            const date = new Date(supp.date);
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
            const dayOfWeekName = dayNames[date.getDay()];

            html += `
                <div class="supplementary-item">
                    <div class="supplementary-info">
                        <span class="supplementary-date">${month}/${day}(${dayOfWeekName})</span>
                        <span class="supplementary-period">${supp.period}限</span>
                        <span class="supplementary-subject" style="color: ${subject.color || '#6366f1'}">${subject.name}</span>
                        <span class="supplementary-badge">補講</span>
                    </div>
                    <button class="btn btn-small btn-danger" onclick="Schedule.deleteSupplementary('${supp.id}')">削除</button>
                </div>
            `;
        });

        container.innerHTML = html;
    }
};

// グローバルに公開
window.Schedule = Schedule;

