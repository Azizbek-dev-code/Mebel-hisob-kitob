import { FeatureLandingPage } from './FeatureLandingPage';
import { MARKETING_SEO } from '../seo';
import { ROUTES } from '@/routes/paths';

export function MarketingTodoPage() {
  return (
    <FeatureLandingPage
      seo={MARKETING_SEO.todo}
      h1="To-Do — kundalik vazifalaringiz"
      lead="Nima qilish kerakligini yozing, ustuvorlik qo‘ying va kun oxirida progressni ko‘ring. To-do Balancy.Space’da alohida ilova emas — reja, fokus va maqsadlaringiz bilan birga ishlaydi."
      bullets={[
        'Vazifa yaratish, tahrirlash va yakunlash',
        'Kundalik reja bilan bog‘liq progress',
        'Fokus sessiyalariga o‘tish oson',
      ]}
      related={[
        { to: ROUTES.marketingPomodoro, label: 'Pomodoro' },
        { to: ROUTES.marketingGoals, label: 'Maqsadlar' },
        { to: ROUTES.marketingHabits, label: 'Odatlar' },
        { to: ROUTES.home, label: 'Bosh sahifa' },
      ]}
    />
  );
}

export function MarketingHabitsPage() {
  return (
    <FeatureLandingPage
      seo={MARKETING_SEO.habits}
      h1="Habit tracker — foydali odatlar"
      lead="Kichik kundalik qadamlar katta natijaga olib keladi. Balancy.Space habit tracker bilan odatlarni belgilang, bajarilishini belgilang va streak orqali izchillikni saqlang."
      bullets={[
        'Kundalik odatlarni kuzatish',
        'Streak va progress',
        'XP orqali rag‘batlantirish (hisob ichida)',
      ]}
      related={[
        { to: ROUTES.marketingTodo, label: 'To-Do' },
        { to: ROUTES.marketingGoals, label: 'Maqsadlar' },
        { to: ROUTES.marketingPomodoro, label: 'Fokus' },
        { to: ROUTES.home, label: 'Bosh sahifa' },
      ]}
    />
  );
}

export function MarketingPomodoroPage() {
  return (
    <FeatureLandingPage
      seo={MARKETING_SEO.pomodoro}
      h1="Pomodoro fokus taymeri"
      lead="Chalg‘itishlarni kamaytiring: fokus sessiyasi, pauza va qayta boshlash. Taymer vazifalaringiz bilan bir makonda — alohida tab ochib yurish shart emas."
      bullets={[
        'Fokus sessiyalarini boshlash va yakunlash',
        'Vaqtni boshqarish va chuqur ish',
        'To-do va maqsadlar bilan bog‘liq oqim',
      ]}
      related={[
        { to: ROUTES.marketingTodo, label: 'To-Do' },
        { to: ROUTES.marketingGoals, label: 'Maqsadlar' },
        { to: ROUTES.home, label: 'Bosh sahifa' },
      ]}
    />
  );
}

export function MarketingFinancePage() {
  return (
    <FeatureLandingPage
      seo={MARKETING_SEO.finance}
      h1="Shaxsiy moliya"
      lead="Daromad va xarajatni yozing, budjet qo‘ying, jamg‘arma maqsadlariga boring. Moliyaviy nazorat Balancy.Space’da productivity vositalari bilan yonma-yon."
      bullets={[
        'Daromad va xarajat tarixi',
        'Budjet va toifalar',
        'Jamg‘arma maqsadlari va progress',
      ]}
      related={[
        { to: ROUTES.marketingGoals, label: 'Maqsadlar' },
        { to: ROUTES.marketingPricing, label: 'Tariflar' },
        { to: ROUTES.home, label: 'Bosh sahifa' },
      ]}
    />
  );
}

export function MarketingGoalsPage() {
  return (
    <FeatureLandingPage
      seo={MARKETING_SEO.goals}
      h1="Maqsad tracker"
      lead="Aniq maqsad qo‘ying, progressni kuzating va yakuniga yetkazing. Maqsadlar moliya, vazifa va odatlaringiz bilan bir xil makonda yashaydi."
      bullets={[
        'Shaxsiy maqsadlar va progress',
        'Hisobdorlik va izchillik',
        'Level / XP orqali rag‘bat',
      ]}
      related={[
        { to: ROUTES.marketingTodo, label: 'To-Do' },
        { to: ROUTES.marketingHabits, label: 'Odatlar' },
        { to: ROUTES.marketingFinance, label: 'Moliya' },
        { to: ROUTES.home, label: 'Bosh sahifa' },
      ]}
    />
  );
}
