import type { ExamResult } from '../types/cbt';

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getPerformanceBand(score: number): {
  label: string;
  summary: string;
} {
  if (score >= 80) {
    return {
      label: 'Distinction',
      summary: 'Strong command across core UTME Chemistry domains.',
    };
  }
  if (score >= 65) {
    return {
      label: 'Merit',
      summary: 'Solid preparation with minor topic gaps to tighten.',
    };
  }
  if (score >= 50) {
    return {
      label: 'Credit',
      summary: 'Foundational grasp established; review missed concepts below.',
    };
  }
  return {
    label: 'Needs Review',
    summary: 'Focus on weak topics highlighted in the breakdown before retrying.',
  };
}

export function downloadScorecardReport(result: ExamResult): void {
  const topicLines = result.topicStats
    .map(
      (stat) =>
        `  - ${stat.topic.padEnd(26, ' ')} ${String(stat.correct).padStart(2, ' ')}/${String(stat.total).padEnd(2, ' ')} (${stat.percentage}%)`,
    )
    .join('\n');

  const report = [
    '====================================================',
    'CORVEXA CHEMISTRY CBT — EXAMINATION SCORECARD',
    '====================================================',
    `Examination Year : ${result.year} UTME`,
    `Session Mode     : ${result.mode === 'timed' ? 'Timed (40:00)' : 'Untimed Study'}`,
    `Completed At     : ${new Date(result.completedAt).toLocaleString()}`,
    `Time Elapsed     : ${formatDuration(result.elapsedSeconds)}`,
    '----------------------------------------------------',
    `Final Score      : ${result.score} / 100`,
    `Correct Answers  : ${result.correct} / ${result.totalQuestions}`,
    `Incorrect        : ${result.incorrect}`,
    `Unanswered       : ${result.unanswered}`,
    `Performance Band : ${getPerformanceBand(result.score).label}`,
    '----------------------------------------------------',
    'TOPIC BREAKDOWN',
    topicLines,
    '====================================================',
    'Corvexa Academic Solutions',
    '====================================================',
  ].join('\n');

  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Corvexa_Chemistry_${result.year}_Scorecard.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
