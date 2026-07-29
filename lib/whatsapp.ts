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

  msg +=
    " What time will the router be delivered? Kindly share your location via WhatsApp so we can check the 5G coverage in your area if you haven't already.";

  msg += " Thank you!";

  return msg;
}

/**
 * Build a WhatsApp reminder message to send to a DSE
 * about a specific follow-up they need to action.
 * This is used when manually reminding a DSE about a prospect follow-up.
 */
export function buildDseReminderMessage(params: {
  dseName: string;
  prospectName: string;
  status: string;
  dueDate: string;
}): string {
  const { dseName, prospectName, status, dueDate } = params;

  let msg = `🔔 *Follow-up Reminder* 🔔\n\n`;
  msg += `Hi ${dseName},\n\n`;
  msg += `You have a *${status}* follow-up with *${prospectName}* (Due: ${dueDate}).\n\n`;
  msg += `Kindly check your app and follow up now!\n\n`;
  msg += `- SuperAdmin`;

  return msg;
}

/**
 * Build a consolidated "morning batch" WhatsApp message for a DSE
 * listing ALL their follow-ups due today.
 * This is used when the superadmin sends the morning batch at 06:00.
 */
export function buildDseBatchMessage(params: {
  dseName: string;
  followups: { prospectName: string; status: string; dueDate: string }[];
}): string {
  const { dseName, followups } = params;

  let msg = `🌅 *Good Morning ${dseName}!* 🌅\n\n`;
  msg += `Here are your follow-ups for today:\n\n`;

  followups.forEach((fu, idx) => {
    msg += `${idx + 1}. *${fu.prospectName}* — ${fu.status}`;
    if (fu.dueDate) msg += ` (Due: ${fu.dueDate})`;
    msg += `\n`;
  });

  msg += `\nPlease check your app and follow up on each one.`;
  msg += `\n\n- SuperAdmin`;

  return msg;
}
