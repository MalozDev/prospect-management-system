"use client";

import { useEffect, useState, useRef } from "react";
import { getStoredApiUser, setStoredApiUser } from "@/lib/api-client";
import { SupervisorPromptModal } from "./SupervisorPromptModal";

/**
 * Checks on mount whether the current DSE user has a "NOT_ON_BOARD" status
 * and whether new supervisors have appeared since their last check.
 *
 * If new supervisors exist, shows the exact same supervisor selection modal
 * that appears on login — no need to log out and back in.
 *
 * Place this in the DSE layout so it runs on any DSE page load.
 */
export function SupervisorSessionCheck() {
  const [showModal, setShowModal] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    // Only check once per page load
    if (checkedRef.current) return;
    checkedRef.current = true;

    const apiUser = getStoredApiUser();
    if (!apiUser || apiUser.role !== "DSE") return;

    const supervisor = apiUser.supervisor || "";

    // If DSE already has a real supervisor — no prompt needed
    if (supervisor && supervisor !== "UNASSIGNED" && supervisor !== "NOT_ON_BOARD") return;

    // Fetch current supervisor count and compare with checkedAt
    async function check() {
      try {
        // Get current supervisor count
        const supRes = await fetch("/api/supervisors");
        if (!supRes.ok) return;
        const supData = await supRes.json();
        const currentCount = supData.supervisors?.length || 0;

        // Get DSE's last checked count
        const meRes = await fetch("/api/users/me", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("crm-auth-token")}`,
          },
        });
        if (!meRes.ok) return;
        const meData = await meRes.json();
        const checkedAt = meData.user?.supervisorCheckedAt || 0;

        // If new supervisors have appeared since last check — show the prompt
        if (currentCount > checkedAt) {
          setShowModal(true);
        }
      } catch {
        // Network error — silently skip
      }
    }

    check();
  }, []);

  const handleComplete = () => {
    setShowModal(false);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <SupervisorPromptModal
      isOpen={showModal}
      onComplete={handleComplete}
      onClose={handleClose}
    />
  );
}
