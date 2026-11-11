import { QuestionAttemptResponse, QuestionItem } from '../types';

export interface DraftAnswerState {
  selectedOptionIndex?: number | null;
  selectedOptionIndices?: number[];
  natAnswer?: string;
  markedForReview: boolean;
  visited: boolean;
  timeSpentSeconds: number;
}

/**
 * Evaluates a single question strictly according to official GATE 2027 rules:
 * - MCQ: +marks if exact, -marks/3 if wrong (-1/3 for 1M, -2/3 for 2M)
 * - MSQ: +marks only if exact set matches; 0 if wrong or partial (no negative marking)
 * - NAT: +marks if parsed numeric value lies within [natMin, natMax]; 0 if wrong (no negative marking)
 */
export function evaluateQuestionResponse(
  question: QuestionItem,
  draft: DraftAnswerState
): QuestionAttemptResponse {
  let isAttempted = false;
  let isCorrect = false;
  let marksAwarded = 0;

  if (question.type === 'MCQ') {
    if (draft.selectedOptionIndex !== undefined && draft.selectedOptionIndex !== null) {
      isAttempted = true;
      if (draft.selectedOptionIndex === question.correctOptionIndex) {
        isCorrect = true;
        marksAwarded = question.marks;
      } else {
        isCorrect = false;
        marksAwarded = -(question.marks / 3);
      }
    }
  } else if (question.type === 'MSQ') {
    const selected = [...(draft.selectedOptionIndices ?? [])].sort((a, b) => a - b);
    if (selected.length > 0) {
      isAttempted = true;
      const expected = [...(question.correctOptionIndices ?? [])].sort((a, b) => a - b);
      isCorrect =
        selected.length === expected.length &&
        selected.every((val, idx) => val === expected[idx]);
      marksAwarded = isCorrect ? question.marks : 0;
    }
  } else if (question.type === 'NAT') {
    const raw = (draft.natAnswer ?? '').trim();
    if (raw !== '') {
      isAttempted = true;
      const num = Number(raw);
      if (
        !Number.isNaN(num) &&
        question.natMin !== undefined &&
        question.natMax !== undefined &&
        num >= question.natMin &&
        num <= question.natMax
      ) {
        isCorrect = true;
        marksAwarded = question.marks;
      } else {
        isCorrect = false;
        marksAwarded = 0;
      }
    }
  }

  return {
    questionId: question.id,
    subjectId: question.subjectId,
    topicId: question.topicId,
    type: question.type,
    marks: question.marks,
    selectedOptionIndex: draft.selectedOptionIndex ?? null,
    selectedOptionIndices: draft.selectedOptionIndices ?? [],
    natAnswer: draft.natAnswer ?? '',
    markedForReview: draft.markedForReview,
    visited: draft.visited,
    timeSpentSeconds: Math.round(draft.timeSpentSeconds),
    isCorrect,
    isAttempted,
    marksAwarded: Number(marksAwarded.toFixed(2)),
  };
}

export function roundScore(val: number): number {
  return Number(val.toFixed(2));
}

