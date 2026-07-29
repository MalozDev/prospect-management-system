/**
 * Convert a CUG suffix (4 digits) to a full international phone number
 * suitable for WhatsApp links.
 *
 * The phone prefix is configured via the NEXT_PUBLIC_CUG_PHONE_PREFIX
 * environment variable. For Airtel Zambia this would typically be "26096"
 * so CUG "1234" becomes "+260961234".
 *
 * Falls back to "26096" if the env var is not set.
 */

const DEFAULT_PREFIX = "26096";

export function getCugPhonePrefix(): string {
  return process.env.NEXT_PUBLIC_CUG_PHONE_PREFIX || DEFAULT_PREFIX;
}

/**
 * Build a full phone number from a CUG suffix.
 * Example: CUG "1234" → "+260961234" (with default prefix "26096")
 */
export function buildPhoneFromCug(cugSuffix: string): string {
  const prefix = getCugPhonePrefix();
  const digits = cugSuffix.replace(/\D/g, "");
  return `+${prefix}${digits}`;
}

/**
 * Build a WhatsApp URL to message a DSE about their follow-up(s).
 *
 * @param cugSuffix - The DSE's 4-digit CUG suffix
 * @param message - The pre-filled message text
 * @returns A WhatsApp deep-link URL
 */
export function buildDseWhatsAppUrl(cugSuffix: string, message: string): string {
  const phone = buildPhoneFromCug(cugSuffix);
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
