/**
 * 沖縄高専 出席管理アプリ - ダッシュボードモジュール
 * 出席状況のサマリー表示
 */

const Dashboard = {
  /**
   * 初期化
   */
  init() {
    this.render();
  },

  /**
   * ダッシュボードをレンダリング
   */
  render() {
    this.renderStats();
    this.renderSubjects();
    this.renderAlerts();
  },

  /**
   * 統計カードをレンダリング
   */
  renderStats() {
    const container = document.getElementById('statsGrid');
    if (!container) return;

    const semester = Storage.getCurrentSemester();
    const summary = Calculator.calculateSummary(semester);

    container.innerHTML = `
      <div class="stat-card" style="--stat-color: #6366f1">
        <div class="stat-icon">📚</div>
        <div class="stat-value">${summary.totalSubjects}</div>
        <div class="stat-label">登録科目数</div>
      </div>
      <div class="stat-card" style="--stat-color: #10b981">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${summary.totalAttended}</div>
        <div class="stat-label">総出席回数</div>
      </div>
      <div class="stat-card" style="--stat-color: ${summary.averageAttendanceRate >= 80 ? '#10b981' : summary.averageAttendanceRate >= 67 ? '#f59e0b' : '#ef4444'}">
        <div class="stat-icon">📊</div>
        <div class="stat-value">${summary.averageAttendanceRate}%</div>
        <div class="stat-label">平均出席率</div>
      </div>
      <div class="stat-card" style="--stat-color: #ef4444">
        <div class="stat-icon">⚠️</div>
        <div class="stat-value">${summary.dangerCount + summary.warningCount}</div>
        <div class="stat-label">注意科目数</div>
      </div>
    `;
  },

  /**
   * 科目リストをレンダリング
   */
  renderSubjects() {
    const container = document.getElementById('subjectsList');
    if (!container) return;

    const semester = Storage.getCurrentSemester();
    const allStats = Calculator.calculateAllStats(semester);

    if (allStats.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📚</div>
          <div class="empty-state-text">科目が登録されていません</div>
          <div class="empty-state-action">
            <button class="btn btn-primary" onclick="App.navigateTo('schedule')">
              <span>➕</span> 科目を追加する
            </button>
          </div>
        </div>
      `;
      return;
    }

    // 出席率の降順でソート
    const sortedStats = [...allStats].sort((a, b) => a.remainingAbsences - b.remainingAbsences);

    let html = '';
    sortedStats.forEach(stats => {
      const progress = Calculator.calculateProgress(stats);
      const progressColor = Calculator.getProgressColor(stats.riskLevel);

      html += `
        <div class="subject-item">
          <div class="subject-info">
            <div class="subject-color" style="background: ${stats.color}"></div>
            <div class="subject-details">
              <h3>${stats.subjectName}</h3>
              <div class="subject-meta">
                出席: ${stats.attendedClasses}/${stats.totalClasses} | 
                欠課: ${stats.totalAbsences} | 
                残り欠席可能: ${stats.remainingAbsences}回
              </div>
            </div>
          </div>
          <div class="subject-stats">
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%; background: ${progressColor}"></div>
              </div>
              <div class="progress-text">${progress}%達成</div>
            </div>
            <div class="attendance-rate ${stats.riskLevel}">${stats.attendanceRate}%</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  /**
   * アラートをレンダリング
   */
  renderAlerts() {
    const container = document.getElementById('alertsList');
    if (!container) return;

    const semester = Storage.getCurrentSemester();
    const settings = Storage.getSettings();
    const alertSubjects = Calculator.getAlertSubjects(semester, settings.warningThreshold);

    if (alertSubjects.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👍</div>
          <div class="empty-state-text">全ての科目が安全です</div>
        </div>
      `;
      return;
    }

    let html = '';
    alertSubjects.forEach(stats => {
      const isDanger = stats.remainingAbsences <= 0;
      const alertClass = isDanger ? '' : 'warning';
      const icon = isDanger ? '🚨' : '⚠️';

      let message = '';
      if (stats.remainingAbsences <= 0) {
        message = '欠席上限に達しています！これ以上欠席すると単位が取得できません。';
      } else {
        message = `残り欠席可能回数: ${stats.remainingAbsences}回 (遅刻: ${3 - (stats.lateCount % 3)}回で1欠課)`;
      }

      html += `
        <div class="alert-item ${alertClass}">
          <div class="alert-icon">${icon}</div>
          <div class="alert-content">
            <h4>${stats.subjectName}</h4>
            <p>${message}</p>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }
};

// グローバルに公開
window.Dashboard = Dashboard;
