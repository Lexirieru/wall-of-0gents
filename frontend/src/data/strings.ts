// Mirror of project-sami/locales/en.json — used as static data
// since Strapi/Nuxt i18n isn't wired up in this PHASE 1 conversion.
export const t = {
  the: 'The',
  address: 'Address',
  collaboration: 'Collaboration',
  mail: 'Email',
  consultation: 'Consultation',
  close: 'close',
  loading: 'loading',
  learn_more: 'learn more',
  subservices: 'Subservices',
  optional_service: 'optional service',
  worked_with: 'worked with',
  industry: 'industry',
  all_projects: 'All projects',
  from: 'from',
  brands: 'brands',
  influencers: 'influencers',
  watch_project: 'Watch project',
  feedback: 'feedback',
  cookie_text: 'We use cookies to improve your experience.',
  accept: 'accept',
  press_hold: 'press & hold',
  drag_read: 'drag & read',
  hold_turn: 'hold & turn',
  how_cool: 'How cool is this? \u{1F60E}',
  hold_scratch: 'Hold & scratch',
  prev_fact: 'prev fact',
  next_fact: 'next fact',
  get_in_touch: 'Get in touch',
  coffee_chat: 'Coffee Chat? \u{1F485}\u{1F3FB}',
  lets_talk: 'let’s talk',
  ready_to_create: 'Ready to create? ✨',
  header: {
    intro: 'intro',
    about: 'about',
    services: 'services',
    works: 'works',
    feedback: 'feedback',
    contact: 'contact',
    menu: 'menu',
  },
  footer: {
    form_button: 'Say hi',
    budget_title: 'budget spent',
    boom: 'boom',
    copyright: 'All rights reserved',
    dev_title: 'Driven by ❤️, ☕ & big ideas',
    dev_by: 'dev by',
    terms: 'Terms of Use',
    policy: 'Privacy Policy',
    agreement: 'User Agreement',
  },
  form: {
    lets_connect: 'let’s connect',
    our_time: 'Our time',
    your_time: 'Your time',
    hi_my_name_is: 'Hello! My name is',
    and_i_work_at: 'and I am',
    reaching_out_to_discuss: 'I am reaching out to you regarding',
    i_know_you: 'I know you through',
    feels_like_match: '',
    reach_me_at: 'I’ll leave my contacts:',
    looking_forward: 'Looking forward to your reply!',
    timestamp: 'Timestamp',
    encryption: 'Encryption',
    to: 'To',
    in_short: 'In short',
    your_name: 'Your Name',
    your_company_name: '(exemple: CEO company)',
    select: 'Select',
    message_to_us: 'Here’s a brief description of my request',
    your_email: 'Your Email',
    your_phone: 'Your Phone Number',
    your_telegram: 'Your Telegram',
  },
  project: {
    client: 'Client',
    service: 'Service',
    year: 'Year',
    summary: 'Summary',
    strategy: 'Our Strategy',
    results: 'Results',
  },
} as const

// Static data that was fetched from Strapi in project-sami
export const heroData = {
  photo: '/images/photo-decor.png',
  text: 'A creative-tech studio bringing brands and people closer through experience.',
  description: {
    text1: 'Strategy',
    text2: 'Identity',
    text3: 'Web',
    text4: 'Motion',
    text5: 'Sound',
  },
  subtitle: {
    text1: 'Wall',
    text2: 'of',
    text3: '0gents',
    text4: 'Studio',
  },
}

export const introInfoData = {
  title: 'About 0gents',
  text: 'We craft experiences that turn ideas into living brands, built with care, ambition and a relentless attention to detail.',
  cube: {
    text: 'A studio with a builder mindset.',
  },
  vision: {
    text: 'Our vision is to make the web a richer place — one design at a time.',
  },
}

export const preloaderData = {
  info1: { number: '01', text: 'Welcome to Wall of 0gents.' },
  info2: { number: '02', text: 'Where ideas become onchain experiences.' },
  info3: { number: '03', text: 'Crafted with love, code, and creativity.' },
  info4: { number: '04', text: 'Ready when you are.' },
}

export const aboutDetails = {
  title: 'About',
  description: 'We design, build, and grow brands online — combining strategy with craft.',
  facts: [
    { title: 'Mission', text: 'Make brands feel alive on the web.' },
    { title: 'Values', text: 'Curiosity, craft, courage, and care.' },
    { title: 'Approach', text: 'Concept-first. Always purposeful.' },
  ],
  team: [
    { name: 'Sami Lead', role: 'Founder · Creative Director', photo: '/images/photo-decor.png' },
    { name: 'Sami Build', role: 'Engineering Lead', photo: '/images/photo-decor.png' },
    { name: 'Sami Make', role: 'Brand Designer', photo: '/images/photo-decor.png' },
    { name: 'Sami Sound', role: 'Audio & Motion', photo: '/images/photo-decor.png' },
  ],
}

export const servicesData = {
  title: 'Services',
  list: [
    { title: 'Brand strategy', items: ['Positioning', 'Naming', 'Storytelling'] },
    { title: 'Identity', items: ['Logo systems', 'Type', 'Color & motion'] },
    { title: 'Digital', items: ['Websites', 'Apps', 'AR & WebGL'] },
    { title: 'Sound', items: ['Sonic ID', 'Soundscape', 'UX sound'] },
  ],
}

export const worksData = {
  title: 'Works',
  items: [
    { title: 'Project Alpha', tag: 'Brand · 2024', image: '/images/photo-decor.png' },
    { title: 'Project Beta', tag: 'Web · 2024', image: '/images/photo-decor.png' },
    { title: 'Project Gamma', tag: 'Identity · 2025', image: '/images/photo-decor.png' },
    { title: 'Project Delta', tag: 'Motion · 2025', image: '/images/photo-decor.png' },
  ],
}

export const monopolyData = {
  title: '0gents · Monopoly',
  description: 'A playful look at the agency mission. Roll the dice and step in.',
}

export const feedbackData = {
  title: 'Feedback',
  reviews: [
    { author: 'Alex M.', role: 'Founder, Studio A', text: 'They turned our half-formed idea into a story we could finally tell.' },
    { author: 'Riya S.', role: 'CMO, Brand B', text: 'A rare studio that cares about every detail without losing the big picture.' },
    { author: 'Léa P.', role: 'Designer, Agency C', text: 'Their work always feels human, even when the tech is bleeding-edge.' },
  ],
}

export const contactData = {
  title: 'Get in touch',
  email: 'hello@wall-of-0gents.xyz',
  address: 'Remote · Global',
  text: 'Tell us what you’re building — we’ll bring the rest.',
}

export const footerData = {
  email: 'hello@wall-of-0gents.xyz',
  instagram: 'https://instagram.com',
  telegram: 'https://t.me',
  linkedin: 'https://linkedin.com',
  youtube: 'https://youtube.com',
  terms: '#',
  privacy: '#',
  budget: {
    perMilliseconds: '0.0001',
    maxBudget: '100',
    tip1: {
      emoji: '\u{1F4B0}',
      text: 'Project budget',
    },
    tip2: {
      emoji: '\u{1F4B8}',
      text: '50% of the budget has been spent.',
    },
    tip3: {
      emoji: '\u{1F4B8}',
      text: '75% of the budget has been spent.',
    },
    tip4: {
      emoji: '\u{1F4A5}',
      text: 'Budget fully spent!',
    },
  },
}
