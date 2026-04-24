import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Section = 'dashboard' | 'journal' | 'finance' | 'insights' | 'profile';
type ThemeMode = 'olive' | 'graphite';
type TransactionType = 'expense' | 'income';

type JournalEntry = {
  id: string;
  date: string;
  mood: string;
  prompt: string;
  html: string;
  images: string[];
};

type Transaction = {
  id: string;
  date: string;
  category: string;
  note: string;
  amount: number;
  type: TransactionType;
};

type Profile = {
  name: string;
  email: string;
  focus: string;
  theme: ThemeMode;
};

type AppState = {
  journalEntries: JournalEntry[];
  transactions: Transaction[];
  salary: number;
  savingsGoal: number;
  profile: Profile;
};

type TransactionDraft = {
  id: string | null;
  date: string;
  category: string;
  note: string;
  amount: string;
  type: TransactionType;
};

const STORAGE_KEY = 'sweta-space-v2';
const LEGACY_STORAGE_KEY = 'sweta-space-state';
const moods = [
  { id: 'calm', emoji: '\u{1F338}', label: 'Calm' },
  { id: 'bright', emoji: '\u{2728}', label: 'Bright' },
  { id: 'soft', emoji: '\u{1F60C}', label: 'Soft' },
  { id: 'dreamy', emoji: '\u{1F319}', label: 'Dreamy' },
  { id: 'cozy', emoji: '\u{1F9F8}', label: 'Cozy' },
] as const;

const financeCategories = [
  { id: 'food', label: 'Food', color: '#5f6f52' },
  { id: 'travel', label: 'Travel', color: '#76856a' },
  { id: 'shopping', label: 'Shopping', color: '#919f83' },
  { id: 'self-care', label: 'Self-care', color: '#b2bca4' },
  { id: 'home', label: 'Home', color: '#c8c1ae' },
  { id: 'other', label: 'Other', color: '#2a2d24' },
] as const;

const prompts = [
  'What felt soft and steady about today?',
  'Which moment deserves a gentle replay tonight?',
  'What did I spend energy on, and was it worth it?',
  'Which tiny win made me feel proud today?',
  'If I could bottle one feeling from today, what would it be?',
];

const quotes = [
  'Small routines shape the life we return to each day.',
  'Clarity comes from noticing, not rushing.',
  'A calm plan is easier to keep than a perfect one.',
  'Reflection turns ordinary days into useful ones.',
];

const sectionCopy: Record<Section, { title: string; eyebrow: string }> = {
  dashboard: { title: "Sweta's Space", eyebrow: 'Overview for today' },
  journal: { title: 'Daily Journal', eyebrow: 'Write, review, and save each day' },
  finance: { title: 'Finance Tracker', eyebrow: 'Track income, spending, and savings' },
  insights: { title: 'Insights & Reports', eyebrow: 'See the patterns behind your money' },
  profile: { title: 'Profile & Settings', eyebrow: 'Keep the space simple and personal' },
};

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getToday() {
  return toDateInput(new Date());
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthKey(value: string | Date) {
  const date = typeof value === 'string' ? parseDate(value) : value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(parseDate(value));
}

function formatMonthLabel(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toRichText(value: string) {
  return value
    .split('\n')
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join('');
}

function normalizeMood(value: string) {
  const directMatch = moods.find((item) => item.id === value);
  if (directMatch) return directMatch.id;

  const emojiMatch = moods.find((item) => item.emoji === value);
  if (emojiMatch) return emojiMatch.id;

  return moods[0].id;
}

function createSeedState(): AppState {
  const today = new Date();

  return {
    salary: 72000,
    savingsGoal: 28000,
    profile: {
      name: 'Sweta',
      email: 'sweta@example.com',
      focus: 'Building a life that feels calm, creative, and financially clear.',
      theme: 'olive',
    },
    journalEntries: [
      {
        id: crypto.randomUUID(),
        date: toDateInput(addDays(today, -2)),
        mood: 'soft',
        prompt: prompts[0],
        html: '<p>I kept the morning slow today and noticed how much lighter everything felt.</p><p>Tea, sunlight, and a short walk gave the day a really cozy start.</p>',
        images: [],
      },
      {
        id: crypto.randomUUID(),
        date: toDateInput(addDays(today, -1)),
        mood: 'bright',
        prompt: prompts[3],
        html: '<p>My small win was checking my expenses before dinner instead of postponing it.</p><p>It made my budget feel less scary and more manageable.</p>',
        images: [],
      },
      {
        id: crypto.randomUUID(),
        date: toDateInput(today),
        mood: 'dreamy',
        prompt: prompts[1],
        html: '<p>Today I want to protect my attention and spend it only on things that truly matter.</p>',
        images: [],
      },
    ],
    transactions: [
      {
        id: crypto.randomUUID(),
        date: toDateInput(addDays(today, -1)),
        category: 'food',
        note: 'Cafe breakfast',
        amount: 420,
        type: 'expense',
      },
      {
        id: crypto.randomUUID(),
        date: toDateInput(addDays(today, -3)),
        category: 'shopping',
        note: 'Journal stickers and pens',
        amount: 980,
        type: 'expense',
      },
      {
        id: crypto.randomUUID(),
        date: toDateInput(addDays(today, -5)),
        category: 'travel',
        note: 'Cab rides',
        amount: 640,
        type: 'expense',
      },
      {
        id: crypto.randomUUID(),
        date: toDateInput(addDays(today, -6)),
        category: 'self-care',
        note: 'Skincare refill',
        amount: 1200,
        type: 'expense',
      },
      {
        id: crypto.randomUUID(),
        date: toDateInput(addDays(today, -12)),
        category: 'home',
        note: 'Fresh flowers and candles',
        amount: 760,
        type: 'expense',
      },
      {
        id: crypto.randomUUID(),
        date: toDateInput(addDays(today, -16)),
        category: 'other',
        note: 'Freelance payout',
        amount: 9000,
        type: 'income',
      },
      {
        id: crypto.randomUUID(),
        date: toDateInput(addMonths(today, -1)),
        category: 'food',
        note: 'Weekend brunch',
        amount: 1350,
        type: 'expense',
      },
      {
        id: crypto.randomUUID(),
        date: toDateInput(addMonths(today, -2)),
        category: 'travel',
        note: 'Train tickets',
        amount: 2100,
        type: 'expense',
      },
      {
        id: crypto.randomUUID(),
        date: toDateInput(addMonths(today, -3)),
        category: 'shopping',
        note: 'Monsoon cardigan',
        amount: 1850,
        type: 'expense',
      },
      {
        id: crypto.randomUUID(),
        date: toDateInput(addMonths(today, -4)),
        category: 'self-care',
        note: 'Wellness checkup',
        amount: 2600,
        type: 'expense',
      },
    ],
  };
}

function normalizeState(raw: unknown): AppState {
  const base = createSeedState();
  if (!isObject(raw)) return base;

  const profile = isObject(raw.profile) ? raw.profile : {};
  const rawJournalEntries = Array.isArray(raw.journalEntries)
    ? raw.journalEntries
    : Array.isArray(raw.journal)
      ? raw.journal
      : [];
  const rawTransactions = Array.isArray(raw.transactions) ? raw.transactions : [];

  const journalEntries = rawJournalEntries
    .map((entry): JournalEntry | null => {
      if (!isObject(entry)) return null;

      const legacyImage = typeof entry.image === 'string' ? [entry.image] : [];
      const images = Array.isArray(entry.images)
        ? entry.images.filter((item): item is string => typeof item === 'string')
        : legacyImage;

      const richText =
        typeof entry.html === 'string'
          ? entry.html
          : typeof entry.text === 'string'
            ? toRichText(entry.text)
            : '';

      return {
        id: typeof entry.id === 'string' ? entry.id : crypto.randomUUID(),
        date: typeof entry.date === 'string' ? entry.date : getToday(),
        mood: normalizeMood(typeof entry.mood === 'string' ? entry.mood : ''),
        prompt: typeof entry.prompt === 'string' ? entry.prompt : prompts[0],
        html: richText,
        images,
      };
    })
    .filter((entry): entry is JournalEntry => Boolean(entry));

  const transactions = rawTransactions
    .map((entry): Transaction | null => {
      if (!isObject(entry)) return null;

      return {
        id: typeof entry.id === 'string' ? entry.id : crypto.randomUUID(),
        date: typeof entry.date === 'string' ? entry.date : getToday(),
        category:
          typeof entry.category === 'string' &&
          financeCategories.some((item) => item.id === entry.category)
            ? entry.category
            : financeCategories[0].id,
        note:
          typeof entry.note === 'string'
            ? entry.note
            : typeof entry.description === 'string'
              ? entry.description
              : 'Untitled',
        amount: typeof entry.amount === 'number' ? entry.amount : 0,
        type: entry.type === 'income' ? 'income' : 'expense',
      };
    })
    .filter((entry): entry is Transaction => Boolean(entry));

  const theme =
    profile.theme === 'graphite' || profile.theme === 'midnight' || profile.theme === 'dark'
      ? 'graphite'
      : 'olive';

  return {
    salary: typeof raw.salary === 'number' ? raw.salary : base.salary,
    savingsGoal: typeof raw.savingsGoal === 'number' ? raw.savingsGoal : base.savingsGoal,
    profile: {
      name: typeof profile.name === 'string' ? profile.name : base.profile.name,
      email: typeof profile.email === 'string' ? profile.email : base.profile.email,
      focus: typeof profile.focus === 'string' ? profile.focus : base.profile.focus,
      theme,
    },
    journalEntries: journalEntries.length ? journalEntries : base.journalEntries,
    transactions: transactions.length ? transactions : base.transactions,
  };
}

function loadState() {
  if (typeof window === 'undefined') {
    return createSeedState();
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return normalizeState(JSON.parse(saved));
    } catch {
      return createSeedState();
    }
  }

  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    try {
      return normalizeState(JSON.parse(legacy));
    } catch {
      return createSeedState();
    }
  }

  return createSeedState();
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Could not read file.'));
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

function buildCalendar(monthDate: Date, entries: Map<string, JournalEntry>) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const gridStart = addDays(firstDay, -firstWeekday);

  return Array.from({ length: 35 }, (_, index) => {
    const date = addDays(gridStart, index);
    const key = toDateInput(date);
    return {
      key,
      day: date.getDate(),
      inMonth: date.getMonth() === monthDate.getMonth(),
      entry: entries.get(key),
    };
  });
}

function App() {
  const [data, setData] = useState<AppState>(() => loadState());
  const [section, setSection] = useState<Section>('dashboard');
  const [journalDate, setJournalDate] = useState(getToday());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [journalMood, setJournalMood] = useState<string>(moods[0].id);
  const [journalPrompt, setJournalPrompt] = useState(prompts[0]);
  const [journalHtml, setJournalHtml] = useState('');
  const [journalImages, setJournalImages] = useState<string[]>([]);
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft>({
    id: null,
    date: getToday(),
    category: financeCategories[0].id,
    note: '',
    amount: '',
    type: 'expense',
  });
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    document.documentElement.style.colorScheme =
      data.profile.theme === 'graphite' ? 'dark' : 'light';
    document.title = `${data.profile.name}'s Space`;
    ChartJS.defaults.color = data.profile.theme === 'graphite' ? '#d7d2c6' : '#453f34';
    ChartJS.defaults.borderColor =
      data.profile.theme === 'graphite' ? 'rgba(215, 210, 198, 0.14)' : 'rgba(69, 63, 52, 0.12)';
  }, [data.profile.name, data.profile.theme]);

  const entriesByDate = useMemo(() => {
    return new Map(data.journalEntries.map((entry) => [entry.date, entry]));
  }, [data.journalEntries]);

  const selectedEntry = entriesByDate.get(journalDate);
  const today = getToday();
  const todayEntry = entriesByDate.get(today);

  useEffect(() => {
    const nextHtml = selectedEntry?.html ?? '';
    setJournalMood(selectedEntry?.mood ?? moods[0].id);
    setJournalPrompt(selectedEntry?.prompt ?? prompts[new Date().getDate() % prompts.length]);
    setJournalHtml(nextHtml);
    setJournalImages(selectedEntry?.images ?? []);

    if (editorRef.current && editorRef.current.innerHTML !== nextHtml) {
      editorRef.current.innerHTML = nextHtml;
    }
  }, [selectedEntry, journalDate]);

  useEffect(() => {
    setCalendarMonth(new Date(parseDate(journalDate).getFullYear(), parseDate(journalDate).getMonth(), 1));
  }, [journalDate]);

  const sortedEntries = useMemo(() => {
    return [...data.journalEntries].sort((left, right) => right.date.localeCompare(left.date));
  }, [data.journalEntries]);

  const sortedTransactions = useMemo(() => {
    return [...data.transactions].sort((left, right) => right.date.localeCompare(left.date));
  }, [data.transactions]);

  const currentMonth = monthKey(today);
  const currentMonthEntries = useMemo(() => {
    return data.journalEntries.filter((entry) => monthKey(entry.date) === currentMonth);
  }, [currentMonth, data.journalEntries]);

  const currentMonthTransactions = useMemo(() => {
    return data.transactions.filter((entry) => monthKey(entry.date) === currentMonth);
  }, [currentMonth, data.transactions]);

  const monthlyExpenses = useMemo(() => {
    return currentMonthTransactions
      .filter((entry) => entry.type === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0);
  }, [currentMonthTransactions]);

  const bonusIncome = useMemo(() => {
    return currentMonthTransactions
      .filter((entry) => entry.type === 'income')
      .reduce((sum, entry) => sum + entry.amount, 0);
  }, [currentMonthTransactions]);

  const monthlyIncome = data.salary + bonusIncome;
  const netSavings = monthlyIncome - monthlyExpenses;
  const savingsProgress = Math.min(
    100,
    Math.max(0, (Math.max(netSavings, 0) / Math.max(data.savingsGoal, 1)) * 100)
  );

  const journalStreak = useMemo(() => {
    const dates = new Set(data.journalEntries.map((entry) => entry.date));
    let streak = 0;
    let cursor = parseDate(today);

    while (dates.has(toDateInput(cursor))) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }

    return streak;
  }, [data.journalEntries, today]);

  const topCategory = useMemo(() => {
    const totals = financeCategories.map((item) => ({
      ...item,
      total: currentMonthTransactions
        .filter((entry) => entry.type === 'expense' && entry.category === item.id)
        .reduce((sum, entry) => sum + entry.amount, 0),
    }));

    return totals.sort((left, right) => right.total - left.total)[0];
  }, [currentMonthTransactions]);

  const categorySummary = useMemo(() => {
    return financeCategories.map((item) => ({
      ...item,
      total: currentMonthTransactions
        .filter((entry) => entry.type === 'expense' && entry.category === item.id)
        .reduce((sum, entry) => sum + entry.amount, 0),
    }));
  }, [currentMonthTransactions]);

  const pieData = useMemo(() => {
    return {
      labels: categorySummary.map((item) => item.label),
      datasets: [
        {
          data: categorySummary.map((item) => item.total),
          backgroundColor: categorySummary.map((item) => item.color),
          borderWidth: 0,
        },
      ],
    };
  }, [categorySummary]);

  const sixMonthTrend = useMemo(() => {
    const snapshots = Array.from({ length: 6 }, (_, index) => {
      const date = addMonths(new Date(), index - 5);
      const key = monthKey(date);
      const transactions = data.transactions.filter((entry) => monthKey(entry.date) === key);
      const income =
        data.salary +
        transactions
          .filter((entry) => entry.type === 'income')
          .reduce((sum, entry) => sum + entry.amount, 0);
      const expenses = transactions
        .filter((entry) => entry.type === 'expense')
        .reduce((sum, entry) => sum + entry.amount, 0);

      return {
        label: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date),
        income,
        expenses,
        savings: income - expenses,
      };
    });

    return {
      labels: snapshots.map((item) => item.label),
      expenses: snapshots.map((item) => item.expenses),
      savings: snapshots.map((item) => item.savings),
    };
  }, [data.salary, data.transactions]);

  const dominantMood = useMemo(() => {
    const moodCount = new Map<string, number>();
    currentMonthEntries.forEach((entry) => {
      moodCount.set(entry.mood, (moodCount.get(entry.mood) ?? 0) + 1);
    });

    const topMood = [...moodCount.entries()].sort((left, right) => right[1] - left[1])[0];
    return moods.find((item) => item.id === topMood?.[0]) ?? moods[0];
  }, [currentMonthEntries]);

  const highestExpense = useMemo(() => {
    return currentMonthTransactions
      .filter((entry) => entry.type === 'expense')
      .sort((left, right) => right.amount - left.amount)[0];
  }, [currentMonthTransactions]);

  const calendarDays = useMemo(() => {
    return buildCalendar(calendarMonth, entriesByDate);
  }, [calendarMonth, entriesByDate]);

  const quoteOfDay = quotes[new Date().getDate() % quotes.length];
  const promptOfDay = prompts[new Date().getDate() % prompts.length];
  const hasExpenseData = categorySummary.some((item) => item.total > 0);
  const journalPreview = todayEntry ? stripHtml(todayEntry.html) : 'No entry yet. Leave yourself a small note tonight.';
  const isEditingTransaction = Boolean(transactionDraft.id);
  const hasJournalContent = stripHtml(journalHtml).length > 0 || journalImages.length > 0;

  function setTheme(theme: ThemeMode) {
    setData((current) => ({
      ...current,
      profile: { ...current.profile, theme },
    }));
  }

  function updateProfile(field: keyof Omit<Profile, 'theme'>, value: string) {
    setData((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [field]: value,
      },
    }));
  }

  function runEditorCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setJournalHtml(editorRef.current?.innerHTML ?? '');
  }

  function handleJournalInput() {
    setJournalHtml(editorRef.current?.innerHTML ?? '');
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const images = await Promise.all(files.map((file) => readFileAsDataUrl(file)));
    setJournalImages((current) => [...current, ...images].slice(0, 6));
    event.target.value = '';
  }

  function saveJournalEntry() {
    if (!hasJournalContent) return;

    const nextEntry: JournalEntry = {
      id: selectedEntry?.id ?? crypto.randomUUID(),
      date: journalDate,
      mood: journalMood,
      prompt: journalPrompt,
      html: journalHtml,
      images: journalImages,
    };

    setData((current) => ({
      ...current,
      journalEntries: [...current.journalEntries.filter((entry) => entry.date !== journalDate), nextEntry],
    }));
  }

  function clearComposer() {
    setJournalHtml('');
    setJournalImages([]);

    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  }

  function deleteJournalEntry(date: string) {
    setData((current) => ({
      ...current,
      journalEntries: current.journalEntries.filter((entry) => entry.date !== date),
    }));

    if (date === journalDate) {
      clearComposer();
      setJournalMood(moods[0].id);
      setJournalPrompt(promptOfDay);
    }
  }

  function saveTransaction() {
    const amount = Number(transactionDraft.amount);
    if (!transactionDraft.note.trim() || amount <= 0) return;

    const nextTransaction: Transaction = {
      id: transactionDraft.id ?? crypto.randomUUID(),
      date: transactionDraft.date,
      category: transactionDraft.category,
      note: transactionDraft.note.trim(),
      amount,
      type: transactionDraft.type,
    };

    setData((current) => ({
      ...current,
      transactions: transactionDraft.id
        ? current.transactions.map((entry) => (entry.id === transactionDraft.id ? nextTransaction : entry))
        : [nextTransaction, ...current.transactions],
    }));

    setTransactionDraft({
      id: null,
      date: getToday(),
      category: financeCategories[0].id,
      note: '',
      amount: '',
      type: 'expense',
    });
  }

  function editTransaction(transaction: Transaction) {
    setTransactionDraft({
      id: transaction.id,
      date: transaction.date,
      category: transaction.category,
      note: transaction.note,
      amount: String(transaction.amount),
      type: transaction.type,
    });
    setSection('finance');
  }

  function deleteTransaction(id: string) {
    setData((current) => ({
      ...current,
      transactions: current.transactions.filter((entry) => entry.id !== id),
    }));

    if (transactionDraft.id === id) {
      setTransactionDraft({
        id: null,
        date: getToday(),
        category: financeCategories[0].id,
        note: '',
        amount: '',
        type: 'expense',
      });
    }
  }

  return (
    <div className={`app-shell theme-${data.profile.theme}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">S</div>
          <div>
            <p className="brand-kicker">Sweta's Journal</p>
            <h1>Sweta's Space</h1>
            <span>journal, budgeting, and weekly review</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {(Object.keys(sectionCopy) as Section[]).map((item) => (
            <button
              key={item}
              className={section === item ? 'nav-item active' : 'nav-item'}
              onClick={() => setSection(item)}
              type="button"
            >
              <span>{sectionCopy[item].title}</span>
              <small>{sectionCopy[item].eyebrow}</small>
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <p className="mini-label">Local storage</p>
          <p>Your journal entries and finance logs stay stored locally in this browser.</p>
          <div className="sidebar-quote">
            <strong>{quoteOfDay}</strong>
          </div>
        </div>
      </aside>

      <main className="content-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">{sectionCopy[section].eyebrow}</p>
            <h2>{sectionCopy[section].title}</h2>
            <span className="topbar-subtitle">
              {section === 'dashboard' ? `Welcome back, ${data.profile.name}` : formatLongDate(today)}
            </span>
          </div>

          <div className="topbar-actions">
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setTheme(data.profile.theme === 'olive' ? 'graphite' : 'olive')}
            >
              {data.profile.theme === 'olive' ? 'Switch to Graphite' : 'Switch to Olive'}
            </button>
          </div>
        </header>

        {section === 'dashboard' && (
          <section className="page">
            <div className="hero-card surface-card">
              <div className="hero-copy">
                <p className="hero-script">Welcome back, Sweta</p>
                <h3>A focused space for your journal and money routine.</h3>
                <p>
                  Keep today's note, this month's spending, and your savings goal in one
                  clean place designed around calm structure.
                </p>
                <div className="hero-actions">
                  <button className="primary-button" type="button" onClick={() => setSection('journal')}>
                    Write today's entry
                  </button>
                  <button className="secondary-button" type="button" onClick={() => setSection('finance')}>
                    Review finances
                  </button>
                </div>
              </div>

              <div className="hero-note">
                <p className="mini-label">Today's prompt</p>
                <strong>{promptOfDay}</strong>
                <p>{quoteOfDay}</p>
              </div>
            </div>

            <div className="metrics-grid">
              <article className="surface-card metric-card">
                <p className="mini-label">Today's journal</p>
                <strong>{journalPreview}</strong>
                <span>{todayEntry ? 'Saved for today' : 'Still waiting for your words'}</span>
              </article>

              <article className="surface-card metric-card">
                <p className="mini-label">Monthly expenses</p>
                <strong>{formatCurrency(monthlyExpenses)}</strong>
                <span>{topCategory?.label ?? 'No category yet'} is leading this month</span>
              </article>

              <article className="surface-card metric-card">
                <p className="mini-label">Savings progress</p>
                <strong>{formatCurrency(netSavings)}</strong>
                <span>{savingsProgress.toFixed(0)}% of your savings goal reached</span>
              </article>

              <article className="surface-card metric-card">
                <p className="mini-label">Journal streak</p>
                <strong>{journalStreak} day{journalStreak === 1 ? '' : 's'}</strong>
                <span>{dominantMood.emoji} has been your most frequent mood this month</span>
              </article>
            </div>

            <div className="dashboard-grid">
              <article className="surface-card">
                <div className="section-heading">
                  <div>
                    <p className="mini-label">Monthly overview</p>
                    <h3>This month at a glance</h3>
                  </div>
                </div>

                <div className="summary-list">
                  <div className="summary-row">
                    <span>Base salary</span>
                    <strong>{formatCurrency(data.salary)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Additional income</span>
                    <strong>{formatCurrency(bonusIncome)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Entries written</span>
                    <strong>{currentMonthEntries.length}</strong>
                  </div>
                </div>

                <div className="progress-block">
                  <div className="progress-label">
                    <span>Savings goal</span>
                    <strong>{formatCurrency(data.savingsGoal)}</strong>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${savingsProgress}%` }} />
                  </div>
                </div>
              </article>

              <article className="surface-card">
                <div className="section-heading">
                  <div>
                    <p className="mini-label">Recent reflections</p>
                    <h3>Journal moments</h3>
                  </div>
                </div>

                <div className="entry-list">
                  {sortedEntries.slice(0, 4).map((entry) => {
                    const mood = moods.find((item) => item.id === entry.mood) ?? moods[0];
                    return (
                      <button
                        key={entry.id}
                        className="entry-list-item"
                        type="button"
                        onClick={() => {
                          setSection('journal');
                          setJournalDate(entry.date);
                        }}
                      >
                        <div>
                          <strong>{formatLongDate(entry.date)}</strong>
                          <p>{stripHtml(entry.html).slice(0, 110)}</p>
                        </div>
                        <span className="pill">
                          {mood.emoji} {mood.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </article>
            </div>
          </section>
        )}

        {section === 'journal' && (
          <section className="page">
            <div className="journal-layout">
              <article className="surface-card editor-card">
                <div className="section-heading">
                  <div>
                    <p className="mini-label">Daily journal</p>
                    <h3>Write with softness and clarity</h3>
                  </div>
                  <span className="pill">{formatLongDate(journalDate)}</span>
                </div>

                <div className="editor-meta-grid">
                  <label className="field">
                    <span>Date</span>
                    <input
                      type="date"
                      value={journalDate}
                      onChange={(event) => setJournalDate(event.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Prompt</span>
                    <select
                      value={journalPrompt}
                      onChange={(event) => setJournalPrompt(event.target.value)}
                    >
                      {prompts.map((prompt) => (
                        <option key={prompt} value={prompt}>
                          {prompt}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mood-row">
                  {moods.map((mood) => (
                    <button
                      key={mood.id}
                      className={journalMood === mood.id ? 'mood-chip active' : 'mood-chip'}
                      onClick={() => setJournalMood(mood.id)}
                      type="button"
                    >
                      <span>{mood.emoji}</span>
                      {mood.label}
                    </button>
                  ))}
                </div>

                <div className="prompt-card">
                  <p className="mini-label">Writing cue</p>
                  <strong>{journalPrompt}</strong>
                </div>

                <div className="toolbar">
                  <button type="button" onClick={() => runEditorCommand('bold')}>
                    Bold
                  </button>
                  <button type="button" onClick={() => runEditorCommand('italic')}>
                    Italic
                  </button>
                  <button type="button" onClick={() => runEditorCommand('insertUnorderedList')}>
                    List
                  </button>
                  <button type="button" onClick={() => runEditorCommand('formatBlock', 'blockquote')}>
                    Quote
                  </button>
                </div>

                <div
                  ref={editorRef}
                  className="journal-editor"
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Capture what happened, how it felt, and what you want to remember..."
                  data-empty={stripHtml(journalHtml).length === 0}
                  onInput={handleJournalInput}
                />

                <div className="attachment-row">
                  <label className="upload-button">
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} />
                    Attach images
                  </label>
                  <span>Up to 6 image memories for this day.</span>
                </div>

                {journalImages.length > 0 && (
                  <div className="image-grid">
                    {journalImages.map((image, index) => (
                      <div className="image-tile" key={`${image.slice(0, 30)}-${index}`}>
                        <img src={image} alt={`Journal memory ${index + 1}`} />
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() =>
                            setJournalImages((current) => current.filter((_, itemIndex) => itemIndex !== index))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="button-row">
                  <button className="primary-button" type="button" onClick={saveJournalEntry}>
                    {selectedEntry ? 'Update entry' : 'Save entry'}
                  </button>
                  <button className="secondary-button" type="button" onClick={clearComposer}>
                    Clear draft
                  </button>
                  {selectedEntry && (
                    <button className="text-button" type="button" onClick={() => deleteJournalEntry(journalDate)}>
                      Delete entry
                    </button>
                  )}
                </div>
              </article>

              <aside className="surface-card calendar-card">
                <div className="section-heading">
                  <div>
                    <p className="mini-label">Calendar view</p>
                    <h3>Past entries</h3>
                  </div>
                  <div className="calendar-controls">
                    <button type="button" onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}>
                      Prev
                    </button>
                    <strong>{formatMonthLabel(calendarMonth)}</strong>
                    <button type="button" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                      Next
                    </button>
                  </div>
                </div>

                <div className="calendar-grid">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <span className="calendar-label" key={day}>
                      {day}
                    </span>
                  ))}

                  {calendarDays.map((day) => {
                    const mood = day.entry
                      ? moods.find((item) => item.id === day.entry?.mood) ?? moods[0]
                      : null;

                    return (
                      <button
                        key={day.key}
                        type="button"
                        className={[
                          'calendar-day',
                          day.inMonth ? '' : 'is-muted',
                          day.key === journalDate ? 'is-selected' : '',
                          day.entry ? 'has-entry' : '',
                        ]
                          .join(' ')
                          .trim()}
                        onClick={() => setJournalDate(day.key)}
                      >
                        <span>{day.day}</span>
                        <small>{mood?.emoji ?? ''}</small>
                      </button>
                    );
                  })}
                </div>

                <div className="entry-list compact">
                  {sortedEntries.slice(0, 6).map((entry) => (
                    <div className="history-card" key={entry.id}>
                      <button type="button" onClick={() => setJournalDate(entry.date)}>
                        <strong>{formatLongDate(entry.date)}</strong>
                        <p>{stripHtml(entry.html).slice(0, 90)}</p>
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => deleteJournalEntry(entry.date)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </section>
        )}

        {section === 'finance' && (
          <section className="page">
            <div className="metrics-grid finance">
              <article className="surface-card metric-card">
                <p className="mini-label">Monthly salary</p>
                <strong>{formatCurrency(data.salary)}</strong>
                <label className="field inline-field">
                  <span>Update salary</span>
                  <input
                    type="number"
                    value={data.salary}
                    onChange={(event) =>
                      setData((current) => ({
                        ...current,
                        salary: Number(event.target.value) || 0,
                      }))
                    }
                  />
                </label>
              </article>

              <article className="surface-card metric-card">
                <p className="mini-label">Savings estimate</p>
                <strong>{formatCurrency(netSavings)}</strong>
                <span>{netSavings >= 0 ? 'Looking healthy this month' : 'Spending is above income right now'}</span>
              </article>

              <article className="surface-card chart-card">
                <div className="section-heading">
                  <div>
                    <p className="mini-label">Expense split</p>
                    <h3>Where money is going</h3>
                  </div>
                </div>

                {hasExpenseData ? (
                  <div className="chart-shell">
                    <Pie
                      data={pieData}
                      options={{
                        plugins: { legend: { position: 'bottom' as const } },
                        maintainAspectRatio: false,
                      }}
                    />
                  </div>
                ) : (
                  <div className="empty-state">Log a few expenses to see your category chart.</div>
                )}
              </article>
            </div>

            <div className="finance-layout">
              <article className="surface-card form-card">
                <div className="section-heading">
                  <div>
                    <p className="mini-label">Add or edit</p>
                    <h3>{isEditingTransaction ? 'Update transaction' : 'New transaction'}</h3>
                  </div>
                </div>

                <div className="type-switch">
                  <button
                    type="button"
                    className={transactionDraft.type === 'expense' ? 'active' : ''}
                    onClick={() => setTransactionDraft((current) => ({ ...current, type: 'expense' }))}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    className={transactionDraft.type === 'income' ? 'active' : ''}
                    onClick={() => setTransactionDraft((current) => ({ ...current, type: 'income' }))}
                  >
                    Income
                  </button>
                </div>

                <label className="field">
                  <span>Category</span>
                  <select
                    value={transactionDraft.category}
                    onChange={(event) =>
                      setTransactionDraft((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  >
                    {financeCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Note</span>
                  <input
                    value={transactionDraft.note}
                    onChange={(event) =>
                      setTransactionDraft((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    placeholder="Groceries, cafe, bonus, commute..."
                  />
                </label>

                <div className="editor-meta-grid">
                  <label className="field">
                    <span>Amount</span>
                    <input
                      type="number"
                      value={transactionDraft.amount}
                      onChange={(event) =>
                        setTransactionDraft((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Date</span>
                    <input
                      type="date"
                      value={transactionDraft.date}
                      onChange={(event) =>
                        setTransactionDraft((current) => ({
                          ...current,
                          date: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="button-row">
                  <button className="primary-button" type="button" onClick={saveTransaction}>
                    {isEditingTransaction ? 'Save changes' : 'Add transaction'}
                  </button>
                  {isEditingTransaction && (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        setTransactionDraft({
                          id: null,
                          date: getToday(),
                          category: financeCategories[0].id,
                          note: '',
                          amount: '',
                          type: 'expense',
                        })
                      }
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
              </article>

              <article className="surface-card transaction-card">
                <div className="section-heading">
                  <div>
                    <p className="mini-label">Recent activity</p>
                    <h3>Transactions</h3>
                  </div>
                  <span className="pill">{sortedTransactions.length} total</span>
                </div>

                <div className="transaction-list">
                  {sortedTransactions.map((transaction) => {
                    const category =
                      financeCategories.find((item) => item.id === transaction.category) ??
                      financeCategories[0];

                    return (
                      <div className="transaction-row" key={transaction.id}>
                        <div className="transaction-main">
                          <span
                            className="category-dot"
                            style={{ backgroundColor: category.color }}
                            aria-hidden="true"
                          />
                          <div>
                            <strong>{transaction.note}</strong>
                            <p>
                              {category.label} . {formatLongDate(transaction.date)}
                            </p>
                          </div>
                        </div>

                        <div className="transaction-side">
                          <span className={transaction.type === 'expense' ? 'amount expense' : 'amount income'}>
                            {transaction.type === 'expense' ? '-' : '+'}
                            {formatCurrency(transaction.amount)}
                          </span>
                          <div className="row-actions">
                            <button type="button" className="text-button" onClick={() => editTransaction(transaction)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => deleteTransaction(transaction.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </div>

            <article className="surface-card chart-wide">
              <div className="section-heading">
                <div>
                  <p className="mini-label">Monthly trend</p>
                  <h3>Expenses across the last six months</h3>
                </div>
              </div>
              <div className="chart-shell wide">
                <Bar
                  data={{
                    labels: sixMonthTrend.labels,
                    datasets: [
                      {
                        label: 'Expenses',
                        data: sixMonthTrend.expenses,
                        backgroundColor: '#5f6f52',
                        borderRadius: 12,
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
            </article>
          </section>
        )}

        {section === 'insights' && (
          <section className="page">
            <div className="metrics-grid">
              <article className="surface-card metric-card">
                <p className="mini-label">Monthly income</p>
                <strong>{formatCurrency(monthlyIncome)}</strong>
                <span>Salary plus any additional income logged this month</span>
              </article>
              <article className="surface-card metric-card">
                <p className="mini-label">Savings growth</p>
                <strong>{formatCurrency(Math.max(netSavings, 0))}</strong>
                <span>{savingsProgress.toFixed(0)}% of your goal is currently covered</span>
              </article>
              <article className="surface-card metric-card">
                <p className="mini-label">Spending habit</p>
                <strong>{topCategory?.label ?? 'Balanced mix'}</strong>
                <span>{topCategory?.total ? `${formatCurrency(topCategory.total)} spent here this month` : 'No dominant category yet'}</span>
              </article>
              <article className="surface-card metric-card">
                <p className="mini-label">Mood pattern</p>
                <strong>
                  {dominantMood.emoji} {dominantMood.label}
                </strong>
                <span>Your journal mood this month has leaned this way most often</span>
              </article>
            </div>

            <div className="dashboard-grid">
              <article className="surface-card chart-wide">
                <div className="section-heading">
                  <div>
                    <p className="mini-label">Savings growth visualization</p>
                    <h3>Income, expenses, and savings</h3>
                  </div>
                </div>
                <div className="chart-shell wide">
                  <Bar
                    data={{
                      labels: sixMonthTrend.labels,
                      datasets: [
                        {
                          label: 'Expenses',
                          data: sixMonthTrend.expenses,
                          backgroundColor: '#8a977a',
                          borderRadius: 12,
                        },
                        {
                          label: 'Savings',
                          data: sixMonthTrend.savings,
                          backgroundColor: '#2a2d24',
                          borderRadius: 12,
                        },
                      ],
                    }}
                    options={{
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom' as const } },
                    }}
                  />
                </div>
              </article>

              <article className="surface-card">
                <div className="section-heading">
                  <div>
                    <p className="mini-label">Breakdown</p>
                    <h3>Spending habits</h3>
                  </div>
                </div>

                <div className="habit-list">
                  <div className="summary-row">
                    <span>Highest expense</span>
                    <strong>{highestExpense ? highestExpense.note : 'No entries yet'}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Highest expense amount</span>
                    <strong>{highestExpense ? formatCurrency(highestExpense.amount) : formatCurrency(0)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Average weekly spend</span>
                    <strong>{formatCurrency(monthlyExpenses / 4.3)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Entries written this month</span>
                    <strong>{currentMonthEntries.length}</strong>
                  </div>
                </div>

                <div className="progress-block large-gap">
                  <div className="progress-label">
                    <span>Goal progress</span>
                    <strong>{savingsProgress.toFixed(0)}%</strong>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${savingsProgress}%` }} />
                  </div>
                </div>
              </article>
            </div>
          </section>
        )}

        {section === 'profile' && (
          <section className="page">
            <div className="dashboard-grid">
              <article className="surface-card">
                <div className="section-heading">
                  <div>
                    <p className="mini-label">Personal details</p>
                    <h3>Profile</h3>
                  </div>
                </div>

                <label className="field">
                  <span>Name</span>
                  <input
                    value={data.profile.name}
                    onChange={(event) => updateProfile('name', event.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Email</span>
                  <input
                    value={data.profile.email}
                    onChange={(event) => updateProfile('email', event.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Personal note</span>
                  <textarea
                    rows={4}
                    value={data.profile.focus}
                    onChange={(event) => updateProfile('focus', event.target.value)}
                  />
                </label>
              </article>

              <article className="surface-card">
                <div className="section-heading">
                  <div>
                    <p className="mini-label">Theme customization</p>
                    <h3>Theme variants</h3>
                  </div>
                </div>

                <div className="theme-grid">
                  <button
                    type="button"
                    className={data.profile.theme === 'olive' ? 'theme-card active' : 'theme-card'}
                    onClick={() => setTheme('olive')}
                  >
                    <span className="theme-preview olive" />
                    <strong>Olive Canvas</strong>
                    <p>Warm cream panels with olive accents and restrained contrast.</p>
                  </button>

                  <button
                    type="button"
                    className={data.profile.theme === 'graphite' ? 'theme-card active' : 'theme-card'}
                    onClick={() => setTheme('graphite')}
                  >
                    <span className="theme-preview graphite" />
                    <strong>Graphite Study</strong>
                    <p>Dark panels, olive highlights, and a quieter workspace feel.</p>
                  </button>
                </div>

                <div className="sidebar-card profile-note">
                  <p className="mini-label">A little note to self</p>
                  <strong>{data.profile.focus}</strong>
                  <p>
                    This space is local-first, distraction-light, and designed to feel like your
                    own private corner of the web.
                  </p>
                </div>
              </article>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
