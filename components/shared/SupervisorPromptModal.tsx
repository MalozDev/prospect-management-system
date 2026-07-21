"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SupervisorSelect from "@/components/forms/SupervisorSelect";
import { apiFetch, getStoredApiUser, setStoredApiUser } from "@/lib/api-client";

interface Props {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Called when the user completes the selection (saves a supervisor or chooses NOT_ON_BOARD) */
  onComplete?: () => void;
  /** Called if the user somehow dismisses via Escape */
  onClose?: () => void;
}

/**
 * Reusable supervisor selection modal — exact same UI and logic as the one
 * shown after login when a DSE needs to pick a supervisor.
 *
 * Fetches /api/supervisors and /api/supervisors for the count.
 * Saves via PATCH /api/users/me.
 */
export function SupervisorPromptModal({ isOpen, onComplete, onClose }: Props) {
  const router = useRouter();
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [savingSupervisor, setSavingSupervisor] = useState(false);
  const [supervisorPromptError, setSupervisorPromptError] = useState("");

  if (!isOpen) return null;

  const handleSaveSupervisor = async () => {
    if (!selectedSupervisor) {
      setSupervisorPromptError("Please select a supervisor or choose 'Not on board'.");
      return;
    }
    setSavingSupervisor(true);
    setSupervisorPromptError("");
    try {
      // Build update payload
      const payload: Record<string, unknown> = { supervisor: selectedSupervisor };

      // If choosing "Not on board" (value is "UNASSIGNED" from the dropdown),
      // store the current supervisor count so we can detect new supervisors later.
      // Map UNASSIGNED → NOT_ON_BOARD in the backend.
      if (selectedSupervisor === "UNASSIGNED") {
        payload.supervisor = "NOT_ON_BOARD";
        try {
          const supRes = await fetch("/api/supervisors");
          const supData = await supRes.json();
          payload.supervisorCheckedAt = supData.supervisors?.length || 0;
        } catch {
          payload.supervisorCheckedAt = 0;
        }
      }

      // Update supervisor assignment
      await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      // Update stored user info
      const apiUser = getStoredApiUser();
      if (apiUser) {
        setStoredApiUser({ ...apiUser, supervisor: selectedSupervisor === "UNASSIGNED" ? "NOT_ON_BOARD" : selectedSupervisor });
      }

      // Notify parent that selection is complete
      onComplete?.();
    } catch (err) {
      setSupervisorPromptError(err instanceof Error ? err.message : "Failed to save supervisor.");
    } finally {
      setSavingSupervisor(false);
    }
  };

  const handleOverlayClick = () => {
    // Block closing by overlay click — user must pick or not see this at all
  };

  // Listen for Escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleOverlayClick}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select supervisor"
        className="relative w-full max-w-md animate-scale-in rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Select Your Supervisor</h2>
            <p className="text-sm text-gray-500">Choose your supervisor to get started.</p>
          </div>
        </div>

        <div className="mb-4">
          <SupervisorSelect
            value={selectedSupervisor}
            onChange={(value) => {
              setSelectedSupervisor(value);
              setSupervisorPromptError("");
            }}
          />
        </div>

        {supervisorPromptError && (
          <p className="mb-3 text-sm text-red-600">{supervisorPromptError}</p>
        )}

        <div className="mt-1 flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <svg className="h-4 w-4 shrink-0 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>
            If your supervisor hasn&apos;t registered yet, choose &quot;Supervisor not on board yet&quot;. You can always update this later.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveSupervisor}
          disabled={savingSupervisor}
          className="mt-4 h-12 w-full rounded-xl bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {savingSupervisor ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving...
            </>
          ) : (
            "Continue to Dashboard"
          )}
        </button>
      </div>
    </div>
  );
}
