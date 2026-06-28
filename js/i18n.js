/**
 * i18n.js — Internationalisation engine
 *
 * How it works:
 *  1. On every page load, initI18n() reads the saved language from IndexedDB
 *  2. Loads the correct locale JSON
 *  3. applyToDOM() stamps every data-i18n element immediately
 *  4. When user switches language in Settings, setLang() saves it, reloads the locale,
 *     re-stamps the DOM, fires 'langchange' so dynamic sections re-render,
 *     then reloads the page so everything starts fresh in the new language
 */

import { getSetting, setSetting } from './storage.js';

// ─── Module state ─────────────────────────────────────────────────────────────

let _strings = {};
let _lang    = 'en';

const LOCALES = {
  'en':    './locales/en.json',
  'zh-CN': './locales/zh-CN.json',
};

// ─── Load & activate a locale ─────────────────────────────────────────────────

export async function loadLocale(lang) {
  if (!LOCALES[lang]) lang = 'en';
  try {
    const resp = await fetch(LOCALES[lang]);
    if (!resp.ok) throw new Error(`Failed to load locale: ${lang}`);
    _strings = await resp.json();
    _lang    = lang;
  } catch (err) {
    console.error('[i18n] locale load error:', err);
    if (lang !== 'en') return loadLocale('en');
  }
}

export async function initI18n() {
  const saved = await getSetting('lang');
  // Fix: parentheses around the ternary so saved value takes priority correctly
  const lang  = saved || (navigator.language.startsWith('zh') ? 'zh-CN' : 'en');
  await loadLocale(lang);
  applyToDOM();
}

export async function setLang(lang) {
  await loadLocale(lang);
  await setSetting('lang', lang);
  applyToDOM();
  // Fire event so any listener on the current page can re-render dynamic content
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  // Reload after a short delay so the user sees the toast, then gets a fully
  // translated fresh page — this is the simplest and most reliable approach
  setTimeout(() => window.location.reload(), 800);
}

export function currentLang() { return _lang; }

// ─── Core translate function ──────────────────────────────────────────────────

export function t(key, vars = {}) {
  const parts  = key.split('.');
  let   result = _strings;
  for (const part of parts) {
    if (result == null) break;
    result = result[part];
  }
  if (result == null) {
    console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  // Return arrays as-is (e.g. weekdays)
  if (Array.isArray(result)) return result;
  if (typeof result === 'object') {
    console.warn(`[i18n] key resolves to object: ${key}`);
    return key;
  }
  let str = String(result);
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, v);
  }
  return str;
}

/**
 * tc(categoryName) — translate a system category name.
 * User-created categories are returned as-is.
 */
export function tc(categoryName = '') {
  const normalized = categoryName.toLowerCase().replace(/\s+/g, '');
  const camelMap = {
    'food':          'food',
    'transport':     'transport',
    'bills':         'bills',
    'shopping':      'shopping',
    'entertainment': 'entertainment',
    'healthcare':    'healthcare',
    'education':     'education',
    'others':        'others',
    'salary':        'salary',
    'freelance':     'freelance',
    'business':      'business',
    'investments':   'investments',
    'otherincome':   'otherIncome',
    'emergencyfund': 'emergencyFund',
    'vacation':      'vacation',
    'investment':    'investment',
    'retirement':    'retirement',
  };
  const jsonKey = camelMap[normalized];
  if (jsonKey && _strings.categories?.[jsonKey]) {
    return _strings.categories[jsonKey];
  }
  return categoryName;
}

// ─── DOM auto-translation ─────────────────────────────────────────────────────

export function applyToDOM(root = document) {
  // Text content
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const val = t(el.dataset.i18n);
    if (typeof val === 'string') el.textContent = val;
  });
  // innerHTML (trusted strings only)
  root.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  // Placeholders
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  // Title attributes
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  // Meta content
  root.querySelectorAll('[data-i18n-content]').forEach((el) => {
    el.setAttribute('content', t(el.dataset.i18nContent));
  });
  // data-quick values on chat quick-entry buttons
  root.querySelectorAll('[data-i18n-quick]').forEach((el) => {
    el.dataset.quick = t(el.dataset.i18nQuick);
  });

  // Sync <html lang=""> attribute
  document.documentElement.lang = _lang;
}

export function getStrings() { return _strings; }

// ─── Bilingual NL parser ──────────────────────────────────────────────────────

export function parseNLBilingual(text) {
  const lower = text.toLowerCase();

  let type     = 'expense';
  let amount   = 0;
  let category = 'Others';

  // Amount extraction
  const amountMatch = text.match(/[\d,]+(\.\d{1,2})?/);
  if (amountMatch) amount = parseFloat(amountMatch[0].replace(',', ''));

  // Type detection — Chinese
  if (/收到|收入|工资|薪资|freelance|自由|兼职|到账|奖金|分红|利息|租金收|营业额/.test(text)) {
    type = 'income';
  } else if (/存入|储蓄|存钱|定存|理财|积累/.test(text)) {
    type = 'savings';
  }

  // Type detection — English
  if (/\b(received|earned|got paid|income|salary)\b/.test(lower)) type = 'income';
  else if (/\b(saved|saving|deposit)\b/.test(lower) && type !== 'income') type = 'savings';

  // Category maps — Chinese
  const zhExpenseMap = {
    'Food':          ['餐饮','午餐','早餐','晚餐','吃','喝','咖啡','奶茶','外卖','餐厅','食物','超市','菜','零食'],
    'Transport':     ['交通','打车','公交','地铁','taxi','滴滴','油费','停车','toll','高速','加油'],
    'Bills':         ['账单','电费','水费','煤气','网费','电话费','手机费','房租','物业','保险','订阅'],
    'Shopping':      ['购物','买','网购','淘宝','京东','服装','衣服','鞋','包','化妆品','数码'],
    'Entertainment': ['娱乐','电影','游戏','KTV','演唱会','旅游','景区','网剧','视频'],
    'Healthcare':    ['医疗','医院','药','诊所','看病','体检','牙科'],
    'Education':     ['教育','学费','课程','书','培训','补习'],
  };

  const zhIncomeMap = {
    'Salary':       ['工资','薪资','月薪','年终','奖金'],
    'Freelance':    ['自由','兼职','稿费','接单'],
    'Business':     ['营业','经营','销售'],
    'Investments':  ['分红','利息','投资收益','理财'],
    'Other Income': ['其他收入','红包','转账收'],
  };

  const zhSavingsMap = {
    'Emergency Fund': ['应急','紧急'],
    'Vacation':       ['旅行','旅游','度假'],
    'Investment':     ['理财','投资'],
    'Retirement':     ['养老','退休'],
  };

  // Category maps — English
  const enExpenseMap = {
    'Food':          ['food','lunch','dinner','breakfast','eat','coffee','restaurant','meal','grocery','groceries','snack'],
    'Transport':     ['transport','grab','uber','petrol','fuel','toll','bus','train','parking','taxi','mrt'],
    'Bills':         ['bill','electric','electricity','water','gas','internet','phone','rent','utilities','insurance'],
    'Shopping':      ['shopping','bought','buy','purchase','clothes','shirt','shoes','online'],
    'Entertainment': ['movie','cinema','netflix','spotify','game','concert','entertainment','streaming'],
    'Healthcare':    ['doctor','clinic','medicine','pharmacy','hospital','health','dental'],
    'Education':     ['course','book','tuition','school','university','education','class'],
  };

  const enIncomeMap = {
    'Salary':       ['salary','payroll','wage'],
    'Freelance':    ['freelance','project','client'],
    'Business':     ['business','sales','revenue'],
    'Investments':  ['investment','dividend','return','profit'],
    'Other Income': ['bonus','allowance'],
  };

  const enSavingsMap = {
    'Emergency Fund': ['emergency'],
    'Vacation':       ['vacation','holiday','travel'],
    'Investment':     ['investment fund'],
    'Retirement':     ['retirement','pension'],
  };

  const expMap = { ...zhExpenseMap,  ...enExpenseMap  };
  const incMap = { ...zhIncomeMap,   ...enIncomeMap   };
  const savMap = { ...zhSavingsMap,  ...enSavingsMap  };

  const activeMap = type === 'income' ? incMap : type === 'savings' ? savMap : expMap;

  let matched = false;
  for (const [cat, keywords] of Object.entries(activeMap)) {
    if (keywords.some((kw) => text.includes(kw) || lower.includes(kw))) {
      category = cat;
      matched  = true;
      break;
    }
  }

  if (!matched) {
    if (type === 'income')  category = 'Other Income';
    if (type === 'savings') category = 'Investment';
    if (type === 'expense') category = 'Others';
  }

  return { type, amount, category, description: text };
}
