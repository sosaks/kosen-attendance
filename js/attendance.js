/**
 * 沖縄高専 出席管理アプリ - 出席記録モジュール
 * 出席記録の入力・表示
 */

const Attendance = {
  /**
   * 初期化
   */
  init() {
    this.setupEventListeners();
    this.setDefaultDate();
    this.render();
  },

  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput) {
      dateInput.addEventListener('change', () => this.render());
    }
  },

  /**
   * デフォルト日付を設定（今日）
   */
  setDefaultDate() {
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.value = today;
    }
  },

  /**
   * 出席記録画面をレンダリング
   */
  render() {
    this.renderTodayClasses();
    this.renderHistory();
  },

  /**
   * 選択された日付の授業をレンダリング
   */
  renderTodayClasses() {
    const container = document.getElementById('todayClasses');
    const dateInput = document.getElementById('attendanceDate');
    if (!container || !dateInput) return;

    const dateValue = dateInput.value;
    const date = new Date(dateValue);
    const classes = Schedule.getClassesForDate(date);

    if (classes.length === 0) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📅</div>
            <div class="empty-state-text">土日は授業がありません</div>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📚</div>
            <div class="empty-state-text">この日の授業はありません</div>
            <div class="empty-state-action">
              <button class="btn btn-primary" onclick="App.navigateTo('schedule')">
                <span>📅</span> 時間割を設定する
              </button>
            </div>
          </div>
        `;
      }
      return;
    }

    let html = '';
    classes.forEach(subject => {
      const record = Storage.getAttendanceRecord(subject.id, dateValue);
      const currentStatus = record ? record.status : null;
      const period = Schedule.PERIODS[subject.period];
      const suppBadge = subject.isSupplementary ? '<span class="supplementary-badge">補講</span>' : '';

      html += `
        <div class="class-attendance-card${subject.isSupplementary ? ' is-supplementary' : ''}">
          <div class="class-attendance-info">
            <div class="class-attendance-color" style="background: ${subject.color || '#6366f1'}"></div>
            <div class="class-attendance-details">
              <h3>${subject.name} ${suppBadge}</h3>
              <div class="class-attendance-meta">${subject.period}限（${period.start}〜${period.end}）</div>
            </div>
          </div>
          <div class="attendance-buttons">
            <button class="attendance-btn ${currentStatus === 'present' ? 'selected' : ''}" 
                    data-status="present"
                    onclick="Attendance.setStatus('${subject.id}', '${dateValue}', 'present')">
              出席
            </button>
            <button class="attendance-btn ${currentStatus === 'absent' ? 'selected' : ''}" 
                    data-status="absent"
                    onclick="Attendance.setStatus('${subject.id}', '${dateValue}', 'absent')">
              欠席
            </button>
            <button class="attendance-btn ${currentStatus === 'late' ? 'selected' : ''}" 
                    data-status="late"
                    onclick="Attendance.setStatus('${subject.id}', '${dateValue}', 'late')">
              遅刻
            </button>
            <button class="attendance-btn ${currentStatus === 'early' ? 'selected' : ''}" 
                    data-status="early"
                    onclick="Attendance.setStatus('${subject.id}', '${dateValue}', 'early')">
              早退
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  /**
   * 出席履歴をレンダリング
   */
  renderHistory() {
    const container = document.getElementById('attendanceHistory');
    if (!container) return;

    const records = Storage.getAttendance();

    if (records.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text">まだ出席記録がありません</div>
        </div>
      `;
      return;
    }

    // 日付の降順でソートし、最新20件を表示
    const sortedRecords = [...records]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);

    let html = '';
    sortedRecords.forEach(record => {
      const subject = Storage.getSubjectById(record.subjectId);
      if (!subject) return;

      const statusLabels = {
        present: '出席',
        absent: '欠席',
        late: '遅刻',
        early: '早退'
      };

      const formattedDate = this.formatDate(record.date);

      html += `
        <div class="history-item">
          <div class="history-info">
            <span class="history-date">${formattedDate}</span>
            <span class="history-subject">${subject.name}</span>
          </div>
          <span class="history-status ${record.status}">${statusLabels[record.status]}</span>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  /**
   * 出席状態を設定
   * @param {string} subjectId - 科目ID
   * @param {string} date - 日付
   * @param {string} status - ステータス
   */
  setStatus(subjectId, date, status) {
    Storage.setAttendanceRecord(subjectId, date, status);

    const statusLabels = {
      present: '出席',
      absent: '欠席',
      late: '遅刻',
      early: '早退'
    };

    App.showToast(`${statusLabels[status]}として記録しました`, 'success');
    this.render();

    // ダッシュボードも更新
    if (window.Dashboard) {
      Dashboard.render();
    }

    // 通知チェック
    if (window.Notifications) {
      Notifications.checkAlerts();
    }
  },

  /**
   * 日付をフォーマット
   * @param {string} dateStr - 日付文字列
   * @returns {string} フォーマット済み日付
   */
  formatDate(dateStr) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = dayNames[date.getDay()];
    return `${month}/${day}(${dayOfWeek})`;
  }
};

// グローバルに公開
window.Attendance = Attendance;
