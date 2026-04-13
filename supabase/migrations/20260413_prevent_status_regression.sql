-- Prevent jobs from being "un-cancelled" by late-running edge functions
-- Overwriting a 'cancelled' status with 'running' or 'completed' is a common race condition.

CREATE OR REPLACE FUNCTION public.prevent_job_status_regression()
RETURNS TRIGGER AS $$
BEGIN
  -- If the job was already cancelled, don't allow it to go back to any other status
  IF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
    RAISE WARNING 'Attempted to move job % from cancelled to %. Reverting to cancelled.', OLD.id, NEW.status;
    NEW.status := 'cancelled';
    NEW.completed_at := OLD.completed_at;
  END IF;

  -- If the job is already completed, don't allow it to go back to running (unlikely but safe)
  IF OLD.status = 'completed' AND NEW.status = 'running' THEN
    NEW.status := 'completed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_prevent_job_status_regression ON public.jobs;
CREATE TRIGGER tr_prevent_job_status_regression
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_job_status_regression();
