package model

import "testing"

func TestTaskVideoCompletedAtOnlyForTerminalStates(t *testing.T) {
	t.Parallel()

	inProgress := &Task{
		Status:     TaskStatusInProgress,
		UpdatedAt:  123,
		FinishTime: 456,
	}
	if got := inProgress.VideoCompletedAt(); got != 0 {
		t.Fatalf("in-progress completed_at=%d want 0", got)
	}

	success := &Task{
		Status:     TaskStatusSuccess,
		UpdatedAt:  123,
		FinishTime: 456,
	}
	if got := success.VideoCompletedAt(); got != 456 {
		t.Fatalf("success completed_at=%d want 456", got)
	}

	failure := &Task{
		Status:    TaskStatusFailure,
		UpdatedAt: 789,
	}
	if got := failure.VideoCompletedAt(); got != 789 {
		t.Fatalf("failure completed_at=%d want 789", got)
	}
}
