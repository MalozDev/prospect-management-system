/**
 * Build a WhatsApp deep-link URL with a pre-filled message.
 *
 * The `text` parameter must be URL-encoded. WhatsApp will open the
 * conversation with that message already typed in the input box.
 */
export function buildWhatsAppUrl(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/**
 * Build the standard follow-up message that a DSE sends to a prospect.
 *
 * Template includes:
 *  - Greeting with title + customer name
 *  - DSE introduction
 *  - Where they met (location)
 *  - Reminder that they asked to be followed up on this date
 *  - Asking about router delivery time
 *  - Asking client to share location for 5G coverage check
 */
export function buildWhatsAppMessage(params: {
  customerName: string;
  dseName: string;
  title?: string;
  location?: string;
  date?: string;
  notes?: string;
}): string {
  const { customerName, dseName, title, location, date, notes } = params;

  const greetingName = title ? `${title} ${customerName}` : customerName;
  let msg = `Hello ${greetingName}, this is ${dseName} from Airtel.`;

  if (location && date) {
    msg += ` We met at ${location} and you asked me to follow up on ${date}.`;
  } else if (location) {
    msg += ` We met at ${location}.`;
  } else if (date) {
    msg += ` You asked me to follow up on ${date}.`;
  }

  if (notes) {
    msg += ` Additional notes: ${notes}.`;
  }

  msg += " What time will the router be delivered? Kindly share your location via WhatsApp so we can check the 5G coverage in your area if you haven't already.";

  msg += " Thank you!";

  return msg;
}
