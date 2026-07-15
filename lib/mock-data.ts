export type ProspectStatus = "NEW" | "CONTACTED" | "POSTPONED" | "SCHEDULEVISIT" | "ONSITE" | "SOLD" | "LOST" | "FOLLOW UP" | "VISIT SCHEDULED";

export interface Prospect {
  id: string;
  name: string;
  phone: string;
  location: string;
  address: string;
  expectedPurchaseDate: string;
  status: ProspectStatus;
  assignedDse: string;
  notes: string;
}

export interface FollowUp {
  id: string;
  customerName: string;
  phone: string;
  expectedPurchaseDate: string;
  status: "TODAY" | "UPCOMING" | "COMPLETED" | "OVERDUE";
  category: "CALL" | "WHATSAPP" | "VISIT";
  isFirstFollowUp?: boolean;
  lastContacted?: string;
}

export interface Sale {
  id: string;
  customer: string;
  packageName: string;
  amount: number;
  soldBy: string;
  date: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  type: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

export const prospects: Prospect[] = [
  {
    id: "P-001",
    name: "Moses Chanda",
    phone: "+260976123456",
    location: "Lusaka CBD",
    address: "Plot 42, Longacres",
    expectedPurchaseDate: "2026-07-15",
    status: "NEW",
    assignedDse: "Nalu",
    notes: "Interested in a family package",
  },
  {
    id: "P-002",
    name: "Martha Banda",
    phone: "+260977456789",
    location: "Ndola",
    address: "House 12, Chifubu",
    expectedPurchaseDate: "2026-07-15",
    status: "CONTACTED",
    assignedDse: "Nalu",
    notes: "Needs time before purchase",
  },
  {
    id: "P-003",
    name: "Emmanuel Phiri",
    phone: "+260955111222",
    location: "Kitwe",
    address: "Mile 5, Riverside",
    expectedPurchaseDate: "2026-07-15",
    status: "SCHEDULEVISIT",
    assignedDse: "Tebo",
    notes: "Wants installation next week",
  },
  {
    id: "P-004",
    name: "Josephine Mwale",
    phone: "+260961333444",
    location: "Lusaka East",
    address: "Flat 3, Kabulonga",
    expectedPurchaseDate: "2026-07-20",
    status: "ONSITE",
    assignedDse: "Nalu",
    notes: "Client is on site",
  },
  {
    id: "P-005",
    name: "Daniel Sinyangwe",
    phone: "+260971123456",
    location: "Livingstone",
    address: "House 5, Maramba",
    expectedPurchaseDate: "2026-07-18",
    status: "SOLD",
    assignedDse: "Tebo",
    notes: "Completed sale package",
  },
  {
    id: "P-006",
    name: "Patricia Tembo",
    phone: "+260978654321",
    location: "Kabwe",
    address: "Plot 16, Makululu",
    expectedPurchaseDate: "2026-07-15",
    status: "NEW",
    assignedDse: "Nalu",
    notes: "Looking for business connection",
  },
  {
    id: "P-007",
    name: "Charles Musonda",
    phone: "+260966777888",
    location: "Mpika",
    address: "House 8, Township",
    expectedPurchaseDate: "2026-07-16",
    status: "POSTPONED",
    assignedDse: "Tebo",
    notes: "Asked for callback",
  },
  {
    id: "P-008",
    name: "Lydia Ngoma",
    phone: "+260953444555",
    location: "Lusaka West",
    address: "Stand 90, Kanyama",
    expectedPurchaseDate: "2026-07-15",
    status: "NEW",
    assignedDse: "Nalu",
    notes: "Interested in mobile broadband",
  },
  {
    id: "P-009",
    name: "Bright Mulenga",
    phone: "+260972555111",
    location: "Kasama",
    address: "Road 2, Mulungushi",
    expectedPurchaseDate: "2026-07-14",
    status: "LOST",
    assignedDse: "Tebo",
    notes: "Chose another provider",
  },
  {
    id: "P-010",
    name: "Ruth Mweemba",
    phone: "+260979222333",
    location: "Chipata",
    address: "House 3, Old Airport",
    expectedPurchaseDate: "2026-07-15",
    status: "CONTACTED",
    assignedDse: "Nalu",
    notes: "Needs consultation",
  },
  {
    id: "P-011",
    name: "Oscar Kalaluka",
    phone: "+260956888999",
    location: "Mazabuka",
    address: "Plot 21, Nanga",
    expectedPurchaseDate: "2026-07-23",
    status: "CONTACTED",
    assignedDse: "Tebo",
    notes: "Needs pricing details",
  },
  {
    id: "P-012",
    name: "Nancy Mumba",
    phone: "+260974444555",
    location: "Lusaka North",
    address: "House 10, Chilanga",
    expectedPurchaseDate: "2026-07-17",
    status: "SCHEDULEVISIT",
    assignedDse: "Nalu",
    notes: "Prefers weekend visit",
  },
  {
    id: "P-013",
    name: "Henry Kafunda",
    phone: "+260973333444",
    location: "Solwezi",
    address: "Plot 30, Township",
    expectedPurchaseDate: "2026-07-15",
    status: "ONSITE",
    assignedDse: "Tebo",
    notes: "Site visit in progress",
  },
  {
    id: "P-014",
    name: "Grace Simukoko",
    phone: "+260958222111",
    location: "Mongu",
    address: "House 15, Limulunga",
    expectedPurchaseDate: "2026-07-20",
    status: "NEW",
    assignedDse: "Nalu",
    notes: "Interested in mobile money bundle",
  },
  {
    id: "P-015",
    name: "Martin Lupiya",
    phone: "+260965333222",
    location: "Choma",
    address: "Stand 7, Mukuni",
    expectedPurchaseDate: "2026-07-24",
    status: "POSTPONED",
    assignedDse: "Tebo",
    notes: "Follow-up requested",
  },
];

export const followUps: FollowUp[] = [
  { id: "F-001", customerName: "Moses Chanda", phone: "+260976123456", expectedPurchaseDate: "2026-07-16", status: "TODAY", category: "CALL", isFirstFollowUp: true },
  { id: "F-002", customerName: "Martha Banda", phone: "+260977456789", expectedPurchaseDate: "2026-07-17", status: "UPCOMING", category: "WHATSAPP", isFirstFollowUp: true },
  { id: "F-003", customerName: "Emmanuel Phiri", phone: "+260955111222", expectedPurchaseDate: "2026-07-15", status: "OVERDUE", category: "VISIT", lastContacted: "Last contacted 2 days ago" },
  { id: "F-004", customerName: "Charles Musonda", phone: "+260966777888", expectedPurchaseDate: "2026-07-16", status: "TODAY", category: "CALL", isFirstFollowUp: true },
  { id: "F-005", customerName: "Lydia Ngoma", phone: "+260953444555", expectedPurchaseDate: "2026-07-20", status: "UPCOMING", category: "WHATSAPP", isFirstFollowUp: false, lastContacted: "Last contacted 1 week ago" },
  { id: "F-006", customerName: "Ruth Mweemba", phone: "+260979222333", expectedPurchaseDate: "2026-07-20", status: "UPCOMING", category: "CALL", isFirstFollowUp: false, lastContacted: "Last contacted 3 days ago" },
  { id: "F-007", customerName: "Oscar Kalaluka", phone: "+260956888999", expectedPurchaseDate: "2026-07-14", status: "OVERDUE", category: "VISIT", lastContacted: "Postponed on 2026-07-12" },
  { id: "F-008", customerName: "Grace Simukoko", phone: "+260958222111", expectedPurchaseDate: "2026-07-20", status: "UPCOMING", category: "CALL", isFirstFollowUp: true },
  { id: "F-009", customerName: "Martin Lupiya", phone: "+260965333222", expectedPurchaseDate: "2026-07-22", status: "UPCOMING", category: "WHATSAPP", isFirstFollowUp: false, lastContacted: "Last contacted 4 days ago" },
  { id: "F-010", customerName: "Nancy Mumba", phone: "+260974444555", expectedPurchaseDate: "2026-07-17", status: "UPCOMING", category: "VISIT", isFirstFollowUp: true },
];

export const sales: Sale[] = [
  { id: "S-001", customer: "Daniel Sinyangwe", packageName: "Home Broadband", amount: 1290, soldBy: "Tebo", date: "2026-07-15" },
  { id: "S-002", customer: "Grace Simukoko", packageName: "Mobile Money Plus", amount: 850, soldBy: "Nalu", date: "2026-07-14" },
  { id: "S-003", customer: "Moses Chanda", packageName: "Business Fibre", amount: 2100, soldBy: "Tebo", date: "2026-07-13" },
  { id: "S-004", customer: "Patricia Tembo", packageName: "Family Pack", amount: 980, soldBy: "Nalu", date: "2026-07-12" },
  { id: "S-005", customer: "Ruth Mweemba", packageName: "Airtel Xstream", amount: 1500, soldBy: "Tebo", date: "2026-07-11" },
  { id: "S-006", customer: "Bright Mulenga", packageName: "Mobile Voice", amount: 650, soldBy: "Nalu", date: "2026-07-10" },
  { id: "S-007", customer: "Emmanuel Phiri", packageName: "Home Broadband", amount: 1290, soldBy: "Tebo", date: "2026-07-09" },
  { id: "S-008", customer: "Martha Banda", packageName: "Family Pack", amount: 940, soldBy: "Nalu", date: "2026-07-08" },
  { id: "S-009", customer: "Henry Kafunda", packageName: "Business Fibre", amount: 1800, soldBy: "Tebo", date: "2026-07-07" },
  { id: "S-010", customer: "Oscar Kalaluka", packageName: "Airtel Xstream", amount: 1020, soldBy: "Nalu", date: "2026-07-06" },
];

export const activities: ActivityItem[] = [
  { id: "A-001", title: "Prospect created", detail: "Moses Chanda added as a new prospect", time: "10 mins ago", type: "prospect" },
  { id: "A-002", title: "Called customer", detail: "Call attempt completed for Martha Banda", time: "35 mins ago", type: "call" },
  { id: "A-003", title: "No answer", detail: "No answer from Emmanuel Phiri", time: "1 hr ago", type: "followup" },
  { id: "A-004", title: "WhatsApp sent", detail: "Pricing details shared with Lydia Ngoma", time: "2 hrs ago", type: "whatsapp" },
  { id: "A-005", title: "Visit scheduled", detail: "Site visit reserved for Charles Musonda", time: "3 hrs ago", type: "visit" },
  { id: "A-006", title: "Arrived on site", detail: "Nalu arrived for Henry Kafunda", time: "4 hrs ago", type: "visit" },
  { id: "A-007", title: "Sale completed", detail: "Sale logged for Daniel Sinyangwe", time: "5 hrs ago", type: "sale" },
  { id: "A-008", title: "Follow up completed", detail: "Follow up completed for Ruth Mweemba", time: "6 hrs ago", type: "followup" },
  { id: "A-009", title: "Prospect updated", detail: "Address updated for Oscar Kalaluka", time: "Yesterday", type: "prospect" },
  { id: "A-010", title: "Marked lost", detail: "Bright Mulenga marked lost", time: "Yesterday", type: "lost" },
  { id: "A-011", title: "Schedule changed", detail: "Visit rescheduled for Martha Banda", time: "2 days ago", type: "visit" },
  { id: "A-012", title: "Reminder sent", detail: "Follow up reminder sent to Grace Simukoko", time: "2 days ago", type: "followup" },
  { id: "A-013", title: "Prospect viewed", detail: "Profile reviewed for Patricia Tembo", time: "2 days ago", type: "prospect" },
  { id: "A-014", title: "Message sent", detail: "WhatsApp sent to Josephine Mwale", time: "3 days ago", type: "whatsapp" },
  { id: "A-015", title: "Visit completed", detail: "Visit completed for Martin Lupiya", time: "3 days ago", type: "visit" },
];

export const notifications: NotificationItem[] = [
  { id: "N-001", title: "Follow up reminder", message: "You have a follow-up scheduled for Moses Chanda today.", time: "10 min ago", unread: true },
  { id: "N-002", title: "Visit reminder", message: "Visit with Emmanuel Phiri is due today.", time: "45 min ago", unread: true },
  { id: "N-003", title: "Overdue reminder", message: "Oscar Kalaluka is overdue for follow-up.", time: "1 hr ago", unread: false },
  { id: "N-004", title: "Sales update", message: "Two new sales were added this week.", time: "3 hrs ago", unread: false },
  { id: "N-005", title: "Prospect update", message: "A new prospect was assigned to you.", time: "Yesterday", unread: true },
  { id: "N-006", title: "New note", message: "A new note was added to Patricia Tembo’s profile.", time: "Yesterday", unread: false },
  { id: "N-007", title: "Visit reminder", message: "Your visit with Martin Lupiya is tomorrow morning.", time: "2 days ago", unread: true },
  { id: "N-008", title: "Follow up reminder", message: "Please complete your follow-up with Lydia Ngoma.", time: "3 days ago", unread: false },
];
