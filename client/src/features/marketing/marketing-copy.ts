export type MarketingLocale = 'uz' | 'ru' | 'en';
export type ProductId =
  | 'overview'
  | 'personal'
  | 'furniture'
  | 'restaurant'
  | 'smm'
  | 'beauty'
  | 'education'
  | 'construction'
  | 'service';

export type ProductFeature = { title: string; description: string };
export type MarketingText = {
  nav: {
    products: string;
    business: string;
    pricing: string;
    resources: string;
    personal: string;
    furniture: string;
    explore: string;
    coming: string;
  };
  header: {
    login: string;
    start: string;
    open: string;
    close: string;
    language: string;
    mobile: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    start: string;
    explore: string;
    selector: string;
    preview: string;
    sample: string;
    personal: string;
    personalHint: string;
    business: string;
    businessHint: string;
    store: string;
    storeHint: string;
    note: string;
  };
  overview: { index: string; title: string; text: string; link: string };
  personal: {
    index: string;
    title: string;
    text: string;
    growthLabel: string;
    growthTitle: string;
    growthText: string;
    growthCta: string;
    focus: string;
    features: ProductFeature[];
  };
  business: {
    index: string;
    title: string;
    text: string;
    available: string;
    cardTitle: string;
    cardText: string;
    asideLabel: string;
    asideTitle: string;
    asideText: string;
    daily: string;
    owner: string;
    modules: string[];
    login: string;
    features: ProductFeature[];
  };
  finder: {
    index: string;
    title: string;
    text: string;
    hint: string;
    cta: string;
    options: { label: string; product: ProductId; feature: number }[];
  };
  coming: {
    index: string;
    title: string;
    text: string;
    available: string;
    soon: string;
    note: string;
    more: string;
    products: { id: ProductId; name: string; status: string }[];
  };
  pricing: {
    index: string;
    title: string;
    text: string;
    soon: string;
    details: string;
    branches: string;
    cta: string;
    plans: { name: string; text: string; note: string }[];
  };
  footer: {
    tagline: string;
    explore: string;
    resources: string;
    account: string;
    create: string;
    faq: string;
  };
  faq: { title: string; items: { q: string; a: string }[] };
  productDetails: Record<
    ProductId,
    { name: string; label: string; description: string; cta: string; features: ProductFeature[] }
  >;
};

export const MARKETING_COPY: Record<MarketingLocale, MarketingText> = {
  uz: {
    nav: {
      products: 'Mahsulotlar',
      business: 'Biznes',
      pricing: 'Tariflar',
      resources: 'Resurslar',
      personal: 'Shaxsiy',
      furniture: 'Mebel do‘koni',
      explore: 'Barcha mahsulotlar',
      coming: 'Tez kunda',
    },
    header: {
      login: 'Kirish',
      start: 'Boshlash',
      open: 'Menyuni ochish',
      close: 'Menyuni yopish',
      language: 'Tilni tanlang',
      mobile: 'Mobil navigatsiya',
    },
    hero: {
      eyebrow: 'SHAXSIY MOLIYA · BIZNES BOSHQARUVI',
      title: 'Hayotingiz.\nBiznesingiz.\nBitta makon.',
      description:
        'Balancy Space shaxsiy moliya va biznes boshqaruvini bitta zamonaviy ekotizimga jamlaydi.',
      start: 'Boshlash',
      explore: 'Mahsulotlarni ko‘rish',
      selector: 'MAKONINGIZNI TANLANG',
      preview: 'Interaktiv namuna',
      sample: 'namuna',
      personal: 'Shaxsiy',
      personalHint: 'Moliya, rejalar va o‘sish',
      business: 'Biznes',
      businessHint: 'Ish jarayonlari va moliya',
      store: 'Mebel do‘koni',
      storeHint: 'Mahsulot, savdo va ombor',
      note: 'O‘zingizga kerak bo‘lgan joydan boshlang',
    },
    overview: {
      index: '01 / YAGONA EKOTIZIM',
      title: 'Kamroq almashish.\nKo‘proq oldinga.',
      text: 'Hayot bitta toifaga sig‘maydi. Balancy Space shaxsiy moliya va biznes vositalarini bir ekotizimga birlashtiradi — har biri o‘z tartibli makonida.',
      link: 'Qanday ishlashini ko‘ring',
    },
    personal: {
      index: '02 / SHAXSIY',
      title: 'Faqat pul nazorati emas.\nMoliyaviy kelajagingizni quring.',
      text: 'Mablag‘laringiz qayerga ketayotganini ko‘ring, reja tuzing va erishmoqchi bo‘lgan maqsadlaringizga yaqin bo‘ling.',
      growthLabel: 'SHAKSIY O‘SISH — BALANCY SPACEY SPACE ICHIDA',
      growthTitle: 'O‘sish rejangizni har kunlik odatga aylantiring.',
      growthText:
        'Odatlar yarating, muhim ishga diqqat qarating, o‘rganishda davom eting va taraqqiyotingizni kuzating.',
      growthCta: 'O‘sish makonini ko‘rish',
      focus: 'Fokus',
      features: [
        {
          title: 'Daromad va xarajatlar',
          description: 'Kirim va chiqimlaringizni yozib, moliyaviy oqimni ko‘ring.',
        },
        {
          title: 'Hisoblar',
          description: 'Shaxsiy hisoblaringiz va hamyonlaringizni bir joyda boshqaring.',
        },
        {
          title: 'Budjetlar va qarzlar',
          description: 'Budjet, qarz va takroriy to‘lovlarni kuzating.',
        },
        {
          title: 'Maqsadlar',
          description: 'Jamg‘arma maqsadlarini belgilang va taraqqiyotni kuzating.',
        },
        {
          title: 'Rejalashtirish',
          description: 'Kalendar va kunlik reja orqali ishlaringizni tartiblang.',
        },
        {
          title: 'O‘sish va statistika',
          description: 'Odatlar, fokus, o‘rganish va o‘sish ko‘rsatkichlari.',
        },
      ],
    },
    business: {
      index: '03 / BIZNES',
      title: 'Biznesingizni\nbitta joydan boshqaring.',
      text: 'Kundalik ish jarayonlari va moliyaviy ko‘rinishni yagona makonga jamlang. Mebel do‘koni uchun Balancy Space allaqachon ishlayapti.',
      available: 'Ishlayotgan mahsulot',
      cardTitle: 'Savdodan oy yakunigacha.',
      cardText: 'Savdo, mahsulot va jamoa ishlarini bir-biriga bog‘langan vositalarda yuriting.',
      asideLabel: 'SAVDO ZALI VA OFIS UCHUN',
      asideTitle: 'Operatsiyalar aniqligi.\nMoliyaviy ko‘rinish.',
      asideText: 'Savdoni qayd qiling, zaxiralarni boshqaring va biznes faoliyatini ko‘rib boring.',
      daily: 'Kundalik ish',
      owner: 'Rahbar ko‘rinishi',
      modules: [
        'Mahsulotlar',
        'Savdo',
        'Xaridlar',
        'Ombor',
        'Mijozlar',
        'Ta’minotchilar',
        'Xodimlar',
        'Xarajatlar',
        'Moliya',
        'Hisobotlar',
        'Boshqaruv paneli',
      ],
      login: 'Ish maydoniga kiring',
      features: [
        {
          title: 'Mahsulotlar',
          description: 'Mebel katalogi va mahsulot ma’lumotlarini boshqaring.',
        },
        { title: 'Savdo', description: 'Savdolar, to‘lovlar va mijoz xarid tarixini yuriting.' },
        {
          title: 'Xaridlar',
          description: 'Xaridlarni qayd qiling va mahsulot zaxirasini yangilang.',
        },
        { title: 'Ombor', description: 'Mavjud mahsulotlar va zaxira harakatlarini kuzating.' },
        { title: 'Mijozlar', description: 'Mijozlar ma’lumotlari va savdo tarixini saqlang.' },
        {
          title: 'Ta’minotchilar',
          description: 'Ta’minotchilar va ular bilan xaridlarni boshqaring.',
        },
        { title: 'Xodimlar', description: 'Xodimlar va ularning ish faoliyatini yuriting.' },
        { title: 'Xarajatlar', description: 'Do‘konning kundalik xarajatlarini kiriting.' },
        { title: 'Moliya', description: 'Daromad, xarajat va foyda ko‘rinishini kuzating.' },
        { title: 'Hisobotlar', description: 'Biznes faoliyati bo‘yicha hisobotlarni ko‘ring.' },
      ],
    },
    finder: {
      index: '04 / EHTIYOJDAN BOSHLANG',
      title: 'Nimani\nboshqarmoqchisiz?',
      text: 'Boshlash nuqtasini tanlang. Sizga mos Balancy Space makonini ko‘rsatamiz.',
      hint: 'BOSHLASH UCHUN YAXSHI JOY',
      cta: 'Shu makonni ko‘rish',
      options: [
        { label: 'Shaxsiy moliyamni', product: 'personal', feature: 0 },
        { label: 'Maqsadlarim va o‘sishimni', product: 'personal', feature: 5 },
        { label: 'Do‘konimni', product: 'furniture', feature: 1 },
        { label: 'Omborimni', product: 'furniture', feature: 3 },
        { label: 'Savdolarimni', product: 'furniture', feature: 1 },
        { label: 'Xodimlarimni', product: 'furniture', feature: 6 },
        { label: 'Biznes moliyamni', product: 'furniture', feature: 8 },
      ],
    },
    coming: {
      index: '05 / KENGAYAYOTGAN EKOTIZIM',
      title: 'Ko‘proq bizneslar.\nYagona Balancy Space.',
      text: 'Balancy Space Business yangi jamoa va sohalar uchun kengaymoqda. Yangi ish makonlari tayyorlanmoqda.',
      available: 'Mavjud',
      soon: 'TEZ KUNDA',
      note: 'Yangi biznes makonlari ishlab chiqilmoqda.',
      more: 'Yana ko‘p mahsulotlar tez kunda',
      products: [
        { id: 'furniture', name: 'Mebel do‘koni', status: 'available' },
        { id: 'restaurant', name: 'Restoran', status: 'soon' },
        { id: 'smm', name: 'SMM agentligi', status: 'soon' },
        { id: 'beauty', name: 'Go‘zallik saloni', status: 'soon' },
        { id: 'education', name: 'Ta’lim markazi', status: 'soon' },
        { id: 'construction', name: 'Qurilish', status: 'soon' },
        { id: 'service', name: 'Xizmat ko‘rsatish', status: 'soon' },
      ],
    },
    pricing: {
      index: '06 / BIZNES TARIFLARI',
      title: 'O‘sishga joy bor,\ntayyor bo‘lganingizda.',
      text: 'Biznes tariflari turli jamoa ehtiyojlariga moslab tayyorlanmoqda. Narxlar ishga tushirish arafasida e’lon qilinadi.',
      soon: 'Tez kunda',
      details: 'Tarif tafsilotlari keyinroq',
      branches: 'Qo‘shimcha filiallar pullik tariflarda bo‘lishi mumkin',
      cta: 'Biznesni ko‘rish',
      plans: [
        {
          name: 'Starter',
          text: 'Balancy Space bilan boshlayotgan kichik bizneslar uchun.',
          note: 'Boshlang‘ich vositalar',
        },
        {
          name: 'Growth',
          text: 'Nazoratni kengaytirayotgan bizneslar uchun.',
          note: 'Kengayish vositalari',
        },
        {
          name: 'Scale',
          text: 'Katta va murakkab ish jarayonlari uchun.',
          note: 'Keng qamrovli boshqaruv',
        },
      ],
    },
    footer: {
      tagline: 'Shaxsiy moliya, rejalar va biznes boshqaruvi uchun yagona makon.',
      explore: 'Mahsulotlar',
      resources: 'Resurslar',
      account: 'Hisobingiz',
      create: 'Hisob yaratish',
      faq: 'Ko‘p so‘raladigan savollar',
    },
    faq: {
      title: 'Ko‘p so‘raladigan savollar',
      items: [
        {
          q: 'Balancy Space nima?',
          a: 'Shaxsiy moliya va biznes boshqaruvini bir ekotizimda birlashtiruvchi mahsulotlar makoni.',
        },
        {
          q: 'Qaysi mahsulotlardan hozir foydalanish mumkin?',
          a: 'Shaxsiy hisob va mebel do‘koni uchun biznes makoni hozir mavjud. Boshqa biznes yo‘nalishlari tez kunda taqdim etiladi.',
        },
        {
          q: 'Shaxsiy hisob nimalarni o‘z ichiga oladi?',
          a: 'Daromad va xarajatlar, hisoblar, budjetlar, maqsadlar, rejalashtirish hamda odatlar, fokus va o‘sish vositalari.',
        },
        {
          q: 'Biznes tariflari narxi qancha?',
          a: 'Starter, Growth va Scale rejalari tayyorlanmoqda. Rasmiy narxlar keyinroq e’lon qilinadi.',
        },
      ],
    },
    productDetails: {
      overview: {
        name: 'Balancy Space',
        label: 'MAHSULOTLAR EKOTIZIMI',
        description: 'Shaxsiy hayot va biznesingiz uchun yagona zamonaviy makon.',
        cta: 'Boshlash',
        features: [],
      },
      personal: {
        name: 'Balancy Space Personal',
        label: 'SHAXSIY HISOB',
        description: 'Shaxsiy moliyangiz, maqsadlaringiz va o‘sishingiz — bitta joyda.',
        cta: 'Shaxsiy makonni ochish',
        features: [],
      },
      furniture: {
        name: 'Balancy Space for Furniture Stores',
        label: 'MEBEL DO‘KONI · MAVJUD',
        description:
          'Mahsulotlar, savdo, xaridlar, ombor va moliya — do‘koningiz uchun yagona ish makoni.',
        cta: 'Ish maydoniga kirish',
        features: [],
      },
      restaurant: {
        name: 'Balancy Space for Restaurants',
        label: 'RESTORAN · TEZ KUNDA',
        description:
          'Buyurtmalar, menyu, zaxiralar va to‘lovlarni yagona boshqaruvda jamlash rejalashtirilmoqda.',
        cta: 'Kelajakdagi mahsulotlar',
        features: [
          { title: 'Buyurtmalar', description: 'Buyurtmalar va xizmat jarayonlarini boshqarish.' },
          { title: 'Menyu va zaxiralar', description: 'Taomlar, ingredientlar va ombor hisobi.' },
          { title: 'Jamoa va moliya', description: 'Xodimlar, xarajatlar va moliyaviy ko‘rinish.' },
        ],
      },
      smm: {
        name: 'Balancy Space for SMM Agencies',
        label: 'SMM AGENTLIGI · TEZ KUNDA',
        description:
          'Mijozlar, loyihalar va jamoa ishini bitta tartibli makonda boshqarish rejalashtirilmoqda.',
        cta: 'Kelajakdagi mahsulotlar',
        features: [
          {
            title: 'Mijozlar va loyihalar',
            description: 'Mijozlar bilan ish va loyiha holatini yuritish.',
          },
          {
            title: 'Kontent va vazifalar',
            description: 'Kontent rejalari, vazifalar va tasdiqlarni muvofiqlashtirish.',
          },
          {
            title: 'Hisobot va moliya',
            description: 'Jamoa, hisobotlar va xarajatlar ko‘rinishi.',
          },
        ],
      },
      beauty: {
        name: 'Balancy Space for Beauty Salons',
        label: 'GO‘ZALLIK SALONI · TEZ KUNDA',
        description: 'Uchrashuvlar, mijozlar va xizmatlar salon boshqaruviga moslashmoqda.',
        cta: 'Kelajakdagi mahsulotlar',
        features: [
          { title: 'Uchrashuvlar', description: 'Mijoz tashriflari va band vaqtlarni boshqarish.' },
          {
            title: 'Xizmatlar va mijozlar',
            description: 'Xizmatlar ro‘yxati va mijozlar ma’lumotlari.',
          },
          {
            title: 'To‘lovlar va xarajatlar',
            description: 'To‘lovlar, xodimlar va xarajatlarni ko‘rish.',
          },
        ],
      },
      education: {
        name: 'Balancy Space for Education Centers',
        label: 'TA’LIM MARKAZI · TEZ KUNDA',
        description:
          'Talabalar, kurslar va to‘lovlarni ta’lim markazlari uchun boshqarish rejalashtirilmoqda.',
        cta: 'Kelajakdagi mahsulotlar',
        features: [
          {
            title: 'Talabalar va guruhlar',
            description: 'Talabalar, guruhlar va kurslarni yuritish.',
          },
          {
            title: 'O‘qituvchilar va davomat',
            description: 'O‘qituvchilar hamda davomatni kuzatish.',
          },
          {
            title: 'To‘lovlar va hisobotlar',
            description: 'To‘lov holatlari va markaz hisobotlari.',
          },
        ],
      },
      construction: {
        name: 'Balancy Space for Construction',
        label: 'QURILISH · TEZ KUNDA',
        description:
          'Loyihalar, materiallar va xarajatlar uchun yagona nazorat makoni tayyorlanmoqda.',
        cta: 'Kelajakdagi mahsulotlar',
        features: [
          {
            title: 'Loyihalar va shartnomalar',
            description: 'Loyihalar, mijozlar va shartnoma ma’lumotlari.',
          },
          {
            title: 'Materiallar va jamoa',
            description: 'Materiallar hisobi va xodimlar faoliyati.',
          },
          {
            title: 'Xarajatlar va moliya',
            description: 'Loyiha xarajatlari va moliyaviy nazorat.',
          },
        ],
      },
      service: {
        name: 'Balancy Space for Service Businesses',
        label: 'XIZMAT BIZNESI · TEZ KUNDA',
        description:
          'Mijozlar, xizmatlar va buyurtmalarni boshqarish uchun yangi makon ishlab chiqilmoqda.',
        cta: 'Kelajakdagi mahsulotlar',
        features: [
          {
            title: 'Mijozlar va xizmatlar',
            description: 'Mijozlar va xizmatlar katalogini boshqarish.',
          },
          {
            title: 'Buyurtmalar va jamoa',
            description: 'Buyurtmalar hamda xodimlar ishini yuritish.',
          },
          {
            title: 'Xarajatlar va moliya',
            description: 'Xarajatlar va moliyaviy holatni kuzatish.',
          },
        ],
      },
    },
  },
  ru: {
    nav: {
      products: 'Продукты',
      business: 'Бизнес',
      pricing: 'Тарифы',
      resources: 'Ресурсы',
      personal: 'Личное',
      furniture: 'Мебельный магазин',
      explore: 'Все продукты',
      coming: 'Скоро',
    },
    header: {
      login: 'Войти',
      start: 'Начать',
      open: 'Открыть меню',
      close: 'Закрыть меню',
      language: 'Выбрать язык',
      mobile: 'Мобильная навигация',
    },
    hero: {
      eyebrow: 'ЛИЧНЫЕ ФИНАНСЫ · УПРАВЛЕНИЕ БИЗНЕСОМ',
      title: 'Ваша жизнь.\nВаш бизнес.\nОдно пространство.',
      description:
        'Balancy Space объединяет управление личными финансами и бизнесом в современной экосистеме.',
      start: 'Начать',
      explore: 'Изучить продукты',
      selector: 'ВЫБЕРИТЕ ПРОСТРАНСТВО',
      preview: 'Интерактивный просмотр',
      sample: 'пример',
      personal: 'Личное',
      personalHint: 'Финансы, планы и развитие',
      business: 'Бизнес',
      businessHint: 'Операции и финансы',
      store: 'Мебельный магазин',
      storeHint: 'Товары, продажи и склад',
      note: 'Начните с того, что важно сейчас',
    },
    overview: {
      index: '01 / ЕДИНАЯ ЭКОСИСТЕМА',
      title: 'Меньше переключений.\nБольше движения.',
      text: 'Жизнь не помещается в одну категорию. Balancy Space объединяет личные финансы и бизнес-инструменты в одной экосистеме, сохраняя для каждого своё пространство.',
      link: 'Как это работает',
    },
    personal: {
      index: '02 / ЛИЧНОЕ',
      title: 'Больше, чем учёт денег.\nСоздавайте финансовое будущее.',
      text: 'Следите за движением денег, планируйте и не теряйте из виду цели, к которым стремитесь.',
      growthLabel: 'ЛИЧНОЕ РАЗВИТИЕ В BALANCY SPACE',
      growthTitle: 'Пусть план развития станет частью каждого дня.',
      growthText:
        'Формируйте привычки, сосредоточьтесь на важном, учитесь и отслеживайте свой прогресс.',
      growthCta: 'Открыть пространство развития',
      focus: 'Фокус',
      features: [
        {
          title: 'Доходы и расходы',
          description: 'Записывайте поступления и расходы, чтобы видеть денежный поток.',
        },
        { title: 'Счета', description: 'Управляйте личными счетами и кошельками в одном месте.' },
        {
          title: 'Бюджеты и долги',
          description: 'Следите за бюджетами, долгами и регулярными платежами.',
        },
        { title: 'Цели', description: 'Ставьте цели накоплений и отслеживайте прогресс.' },
        {
          title: 'Планирование',
          description: 'Упорядочивайте дела с календарём и планом на день.',
        },
        {
          title: 'Развитие и статистика',
          description: 'Привычки, фокус, обучение и показатели развития.',
        },
      ],
    },
    business: {
      index: '03 / БИЗНЕС',
      title: 'Управляйте бизнесом\nв одном месте.',
      text: 'Объедините ежедневные операции и финансовую картину в одном пространстве. Balancy Space для мебельных магазинов уже работает.',
      available: 'Доступный продукт',
      cardTitle: 'От первой продажи до итогов месяца.',
      cardText: 'Ведите продажи, товары и работу команды с помощью связанных инструментов.',
      asideLabel: 'ДЛЯ ТОРГОВОГО ЗАЛА И ОФИСА',
      asideTitle: 'Точность операций.\nФинансовая ясность.',
      asideText: 'Оформляйте продажи, управляйте запасами и отслеживайте работу бизнеса.',
      daily: 'Ежедневная работа',
      owner: 'Для владельца',
      modules: [
        'Товары',
        'Продажи',
        'Закупки',
        'Склад',
        'Клиенты',
        'Поставщики',
        'Сотрудники',
        'Расходы',
        'Финансы',
        'Отчёты',
        'Панель',
      ],
      login: 'Войти в рабочее пространство',
      features: [
        { title: 'Товары', description: 'Управляйте каталогом мебели и данными товаров.' },
        { title: 'Продажи', description: 'Ведите продажи, платежи и историю покупок клиентов.' },
        { title: 'Закупки', description: 'Учитывайте закупки и обновляйте складские остатки.' },
        { title: 'Склад', description: 'Контролируйте товары в наличии и движение запасов.' },
        { title: 'Клиенты', description: 'Храните данные клиентов и историю продаж.' },
        { title: 'Поставщики', description: 'Управляйте поставщиками и закупками.' },
        { title: 'Сотрудники', description: 'Ведите сотрудников и их рабочую активность.' },
        { title: 'Расходы', description: 'Записывайте ежедневные расходы магазина.' },
        { title: 'Финансы', description: 'Отслеживайте доходы, расходы и прибыль.' },
        { title: 'Отчёты', description: 'Просматривайте отчёты о работе бизнеса.' },
      ],
    },
    finder: {
      index: '04 / НАЧНИТЕ С ПОТРЕБНОСТИ',
      title: 'Чем вы хотите\nуправлять?',
      text: 'Выберите отправную точку — мы покажем подходящее пространство Balancy Space.',
      hint: 'ХОРОШЕЕ МЕСТО ДЛЯ СТАРТА',
      cta: 'Посмотреть это пространство',
      options: [
        { label: 'Личными финансами', product: 'personal', feature: 0 },
        { label: 'Целями и развитием', product: 'personal', feature: 5 },
        { label: 'Магазином', product: 'furniture', feature: 1 },
        { label: 'Складом', product: 'furniture', feature: 3 },
        { label: 'Продажами', product: 'furniture', feature: 1 },
        { label: 'Сотрудниками', product: 'furniture', feature: 6 },
        { label: 'Финансами бизнеса', product: 'furniture', feature: 8 },
      ],
    },
    coming: {
      index: '05 / РАСШИРЕНИЕ ЭКОСИСТЕМЫ',
      title: 'Больше направлений.\nОдин Balancy Space.',
      text: 'Balancy Space Business расширяется для новых команд и сфер. Новые рабочие пространства уже готовятся.',
      available: 'Доступно',
      soon: 'СКОРО',
      note: 'Новые бизнес-пространства в разработке.',
      more: 'Скоро появится ещё больше продуктов',
      products: [
        { id: 'furniture', name: 'Мебельный магазин', status: 'available' },
        { id: 'restaurant', name: 'Ресторан', status: 'soon' },
        { id: 'smm', name: 'SMM-агентство', status: 'soon' },
        { id: 'beauty', name: 'Салон красоты', status: 'soon' },
        { id: 'education', name: 'Учебный центр', status: 'soon' },
        { id: 'construction', name: 'Строительство', status: 'soon' },
        { id: 'service', name: 'Сфера услуг', status: 'soon' },
      ],
    },
    pricing: {
      index: '06 / БИЗНЕС-ТАРИФЫ',
      title: 'Есть куда расти,\nкогда будете готовы.',
      text: 'Бизнес-тарифы готовятся с учётом потребностей разных команд. Цены объявим ближе к запуску.',
      soon: 'Скоро',
      details: 'Подробности тарифа позже',
      branches: 'Дополнительные филиалы могут быть доступны в платных тарифах',
      cta: 'Изучить бизнес',
      plans: [
        {
          name: 'Starter',
          text: 'Для небольших компаний, начинающих с Balancy Space.',
          note: 'Базовые инструменты',
        },
        {
          name: 'Growth',
          text: 'Для растущих команд, которым нужен больший контроль.',
          note: 'Инструменты для роста',
        },
        { name: 'Scale', text: 'Для крупных и сложных операций.', note: 'Расширенное управление' },
      ],
    },
    footer: {
      tagline: 'Одно пространство для личных финансов, планов и управления бизнесом.',
      explore: 'Продукты',
      resources: 'Ресурсы',
      account: 'Аккаунт',
      create: 'Создать аккаунт',
      faq: 'Частые вопросы',
    },
    faq: {
      title: 'Частые вопросы',
      items: [
        {
          q: 'Что такое Balancy Space?',
          a: 'Экосистема продуктов, объединяющая личные финансы и управление бизнесом.',
        },
        {
          q: 'Какие продукты доступны сейчас?',
          a: 'Доступны личный аккаунт и бизнес-пространство для мебельных магазинов. Другие направления появятся позже.',
        },
        {
          q: 'Что входит в личный аккаунт?',
          a: 'Доходы и расходы, счета, бюджеты, цели, планирование, а также инструменты привычек, фокуса и развития.',
        },
        {
          q: 'Сколько стоят бизнес-тарифы?',
          a: 'Тарифы Starter, Growth и Scale готовятся. Официальные цены объявим позже.',
        },
      ],
    },
    productDetails: {
      overview: {
        name: 'Balancy Space',
        label: 'ЭКОСИСТЕМА ПРОДУКТОВ',
        description: 'Современное пространство для личной жизни и бизнеса.',
        cta: 'Начать',
        features: [],
      },
      personal: {
        name: 'Balancy Space Personal',
        label: 'ЛИЧНЫЙ АККАУНТ',
        description: 'Личные финансы, цели и развитие — в одном месте.',
        cta: 'Открыть личное пространство',
        features: [],
      },
      furniture: {
        name: 'Balancy Space for Furniture Stores',
        label: 'МЕБЕЛЬНЫЙ МАГАЗИН · ДОСТУПНО',
        description:
          'Товары, продажи, закупки, склад и финансы — единое рабочее пространство магазина.',
        cta: 'Войти в рабочее пространство',
        features: [],
      },
      restaurant: {
        name: 'Balancy Space for Restaurants',
        label: 'РЕСТОРАН · СКОРО',
        description: 'Заказы, меню, запасы и платежи планируется объединить в одном пространстве.',
        cta: 'Будущие продукты',
        features: [
          { title: 'Заказы', description: 'Управление заказами и обслуживанием.' },
          { title: 'Меню и запасы', description: 'Учёт блюд, ингредиентов и склада.' },
          { title: 'Команда и финансы', description: 'Сотрудники, расходы и финансовая картина.' },
        ],
      },
      smm: {
        name: 'Balancy Space for SMM Agencies',
        label: 'SMM-АГЕНТСТВО · СКОРО',
        description: 'Управление клиентами, проектами и работой команды в едином пространстве.',
        cta: 'Будущие продукты',
        features: [
          { title: 'Клиенты и проекты', description: 'Работа с клиентами и статус проектов.' },
          { title: 'Контент и задачи', description: 'Планы контента, задачи и согласования.' },
          { title: 'Отчёты и финансы', description: 'Команда, отчёты и расходы.' },
        ],
      },
      beauty: {
        name: 'Balancy Space for Beauty Salons',
        label: 'САЛОН КРАСОТЫ · СКОРО',
        description: 'Записи, клиенты и услуги адаптируются для управления салоном.',
        cta: 'Будущие продукты',
        features: [
          { title: 'Записи', description: 'Управление визитами клиентов и временем.' },
          { title: 'Услуги и клиенты', description: 'Список услуг и данные клиентов.' },
          { title: 'Платежи и расходы', description: 'Платежи, сотрудники и расходы.' },
        ],
      },
      education: {
        name: 'Balancy Space for Education Centers',
        label: 'УЧЕБНЫЙ ЦЕНТР · СКОРО',
        description: 'Управление студентами, курсами и платежами для учебных центров.',
        cta: 'Будущие продукты',
        features: [
          { title: 'Студенты и группы', description: 'Учёт студентов, групп и курсов.' },
          {
            title: 'Преподаватели и посещаемость',
            description: 'Преподаватели и контроль посещаемости.',
          },
          { title: 'Платежи и отчёты', description: 'Статусы платежей и отчёты центра.' },
        ],
      },
      construction: {
        name: 'Balancy Space for Construction',
        label: 'СТРОИТЕЛЬСТВО · СКОРО',
        description: 'Готовится единое пространство для проектов, материалов и расходов.',
        cta: 'Будущие продукты',
        features: [
          { title: 'Проекты и договоры', description: 'Данные проектов, клиентов и договоров.' },
          { title: 'Материалы и команда', description: 'Учёт материалов и работа сотрудников.' },
          { title: 'Расходы и финансы', description: 'Расходы проектов и финансовый контроль.' },
        ],
      },
      service: {
        name: 'Balancy Space for Service Businesses',
        label: 'СФЕРА УСЛУГ · СКОРО',
        description: 'Разрабатывается пространство для клиентов, услуг и заказов.',
        cta: 'Будущие продукты',
        features: [
          { title: 'Клиенты и услуги', description: 'Каталог услуг и данные клиентов.' },
          { title: 'Заказы и команда', description: 'Заказы и работа сотрудников.' },
          { title: 'Расходы и финансы', description: 'Расходы и финансовое положение.' },
        ],
      },
    },
  },
  en: {
    nav: {
      products: 'Products',
      business: 'Business',
      pricing: 'Pricing',
      resources: 'Resources',
      personal: 'Personal',
      furniture: 'Furniture store',
      explore: 'Explore all products',
      coming: 'Coming soon',
    },
    header: {
      login: 'Log in',
      start: 'Get started',
      open: 'Open navigation menu',
      close: 'Close navigation menu',
      language: 'Choose language',
      mobile: 'Mobile navigation',
    },
    hero: {
      eyebrow: 'PERSONAL FINANCE · BUSINESS MANAGEMENT',
      title: 'Your life.\nYour business.\nOne space.',
      description:
        'Balancy Space brings personal financial management and business management into one modern ecosystem.',
      start: 'Get started',
      explore: 'Explore products',
      selector: 'CHOOSE YOUR SPACE',
      preview: 'Interactive preview',
      sample: 'sample',
      personal: 'Personal',
      personalHint: 'Money, plans and growth',
      business: 'Business',
      businessHint: 'Operations and finance',
      store: 'Furniture store',
      storeHint: 'Products, sales and stock',
      note: 'Start with what matters today',
    },
    overview: {
      index: '01 / ONE CONNECTED ECOSYSTEM',
      title: 'Less switching.\nMore moving forward.',
      text: 'Life doesn’t fit into one category. Balancy Space brings personal finance and business tools into one ecosystem, with a clear space for each.',
      link: 'See how it works',
    },
    personal: {
      index: '02 / PERSONAL',
      title: 'More than tracking money.\nBuild your financial future.',
      text: 'See where your money goes, make a plan, and stay close to the goals you’re working toward.',
      growthLabel: 'PERSONAL GROWTH, BUILT IN',
      growthTitle: 'Make your growth plan part of every day.',
      growthText:
        'Build habits, focus on meaningful work, keep learning and see your progress over time.',
      growthCta: 'Explore personal growth',
      focus: 'Focus',
      features: [
        {
          title: 'Income and expenses',
          description: 'Record money in and out to understand your cash flow.',
        },
        { title: 'Accounts', description: 'Manage personal accounts and wallets in one place.' },
        {
          title: 'Budgets and debts',
          description: 'Keep track of budgets, debts and recurring payments.',
        },
        { title: 'Goals', description: 'Set saving goals and follow your progress.' },
        { title: 'Planning', description: 'Organize your day with calendar and daily planning.' },
        {
          title: 'Growth and statistics',
          description: 'Habits, focus, learning and growth progress.',
        },
      ],
    },
    business: {
      index: '03 / BUSINESS',
      title: 'Run your business\nfrom one place.',
      text: 'Bring everyday operations and financial visibility into one workspace. Balancy Space for furniture stores is already working.',
      available: 'Available product',
      cardTitle: 'From the first sale to month-end.',
      cardText: 'Keep sales, products and team activity connected through practical tools.',
      asideLabel: 'BUILT FOR THE FLOOR AND THE OFFICE',
      asideTitle: 'Operational detail.\nFinancial clarity.',
      asideText:
        'Record sales, manage stock and review business activity through existing product tools.',
      daily: 'Daily operations',
      owner: 'Owner view',
      modules: [
        'Products',
        'Sales',
        'Purchases',
        'Inventory',
        'Customers',
        'Suppliers',
        'Employees',
        'Expenses',
        'Finance',
        'Reports',
        'Dashboard',
      ],
      login: 'Log in to your workspace',
      features: [
        { title: 'Products', description: 'Manage your furniture catalog and product details.' },
        { title: 'Sales', description: 'Track sales, payments and customer purchase history.' },
        { title: 'Purchases', description: 'Record purchases and update stock.' },
        { title: 'Inventory', description: 'See products on hand and inventory movement.' },
        { title: 'Customers', description: 'Keep customer details and sales history.' },
        { title: 'Suppliers', description: 'Manage suppliers and purchases.' },
        { title: 'Employees', description: 'Manage employees and their work activity.' },
        { title: 'Expenses', description: 'Record day-to-day store expenses.' },
        { title: 'Finance', description: 'Review revenue, expenses and profit.' },
        { title: 'Reports', description: 'View reports about business activity.' },
      ],
    },
    finder: {
      index: '04 / START WITH A NEED',
      title: 'What do you want\nto manage?',
      text: 'Choose a starting point. We’ll show you the Balancy Space that that fits.',
      hint: 'A GOOD PLACE TO BEGIN',
      cta: 'Explore this space',
      options: [
        { label: 'My personal finances', product: 'personal', feature: 0 },
        { label: 'My goals and growth', product: 'personal', feature: 5 },
        { label: 'My store', product: 'furniture', feature: 1 },
        { label: 'My inventory', product: 'furniture', feature: 3 },
        { label: 'My sales', product: 'furniture', feature: 1 },
        { label: 'My employees', product: 'furniture', feature: 6 },
        { label: 'My business finances', product: 'furniture', feature: 8 },
      ],
    },
    coming: {
      index: '05 / A GROWING ECOSYSTEM',
      title: 'More businesses.\nOne Balancy Space.',
      text: 'Balancy Space Business is expanding for more teams and industries. New workspaces are on the way.',
      available: 'Available',
      soon: 'COMING SOON',
      note: 'New business workspaces are in development.',
      more: 'More products coming soon',
      products: [
        { id: 'furniture', name: 'Furniture store', status: 'available' },
        { id: 'restaurant', name: 'Restaurant', status: 'soon' },
        { id: 'smm', name: 'SMM agency', status: 'soon' },
        { id: 'beauty', name: 'Beauty salon', status: 'soon' },
        { id: 'education', name: 'Education center', status: 'soon' },
        { id: 'construction', name: 'Construction', status: 'soon' },
        { id: 'service', name: 'Service business', status: 'soon' },
      ],
    },
    pricing: {
      index: '06 / BUSINESS PLANS',
      title: 'Room to grow,\nwhen you’re ready.',
      text: 'Business plans are being shaped around the needs of different teams. Pricing will be announced closer to launch.',
      soon: 'Coming soon',
      details: 'Plan details to follow',
      branches: 'Additional branches may be offered on paid plans',
      cta: 'Explore Business',
      plans: [
        {
          name: 'Starter',
          text: 'For small businesses starting with Balancy Space.',
          note: 'The essentials',
        },
        {
          name: 'Growth',
          text: 'For growing teams that need more control.',
          note: 'Tools to grow',
        },
        {
          name: 'Scale',
          text: 'For larger and more advanced operations.',
          note: 'Expanded control',
        },
      ],
    },
    footer: {
      tagline: 'One thoughtful space for personal finances, plans and business operations.',
      explore: 'Products',
      resources: 'Resources',
      account: 'Your account',
      create: 'Create an account',
      faq: 'Frequently asked questions',
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        {
          q: 'What is Balancy Space?',
          a: 'A product ecosystem that brings personal finance and business management together.',
        },
        {
          q: 'Which products are available today?',
          a: 'Personal Account and the furniture store workspace are available today. Other business types are coming soon.',
        },
        {
          q: 'What is included in Personal?',
          a: 'Income and expenses, accounts, budgets, goals, planning, plus habit, focus and growth tools.',
        },
        {
          q: 'How much do Business plans cost?',
          a: 'Starter, Growth and Scale plans are being prepared. Official pricing will be announced later.',
        },
      ],
    },
    productDetails: {
      overview: {
        name: 'Balancy Space',
        label: 'CONNECTED PRODUCT ECOSYSTEM',
        description: 'One modern space for your personal life and business.',
        cta: 'Get started',
        features: [],
      },
      personal: {
        name: 'Balancy Space Personal',
        label: 'PERSONAL ACCOUNT',
        description: 'Your personal finances, goals and growth — in one place.',
        cta: 'Open Personal',
        features: [],
      },
      furniture: {
        name: 'Balancy Space for Furniture Stores',
        label: 'FURNITURE STORE · AVAILABLE',
        description:
          'Products, sales, purchases, inventory and finance in one workspace for your store.',
        cta: 'Log in to your workspace',
        features: [],
      },
      restaurant: {
        name: 'Balancy Space for Restaurants',
        label: 'RESTAURANT · COMING SOON',
        description: 'Orders, menus, stock and payments are planned for one restaurant workspace.',
        cta: 'Explore what’s coming',
        features: [
          { title: 'Orders', description: 'Manage orders and service operations.' },
          { title: 'Menu and inventory', description: 'Track menu items, ingredients and stock.' },
          {
            title: 'Team and finance',
            description: 'Employees, expenses and financial visibility.',
          },
        ],
      },
      smm: {
        name: 'Balancy Space for SMM Agencies',
        label: 'SMM AGENCY · COMING SOON',
        description: 'A planned workspace for clients, projects and team coordination.',
        cta: 'Explore what’s coming',
        features: [
          { title: 'Clients and projects', description: 'Manage client work and project status.' },
          {
            title: 'Content and tasks',
            description: 'Coordinate content plans, tasks and approvals.',
          },
          { title: 'Reports and finance', description: 'Team activity, reports and expenses.' },
        ],
      },
      beauty: {
        name: 'Balancy Space for Beauty Salons',
        label: 'BEAUTY SALON · COMING SOON',
        description: 'Appointments, clients and services are being shaped for salon management.',
        cta: 'Explore what’s coming',
        features: [
          { title: 'Appointments', description: 'Manage client visits and available times.' },
          { title: 'Services and clients', description: 'Service list and customer details.' },
          { title: 'Payments and expenses', description: 'Payments, employees and expenses.' },
        ],
      },
      education: {
        name: 'Balancy Space for Education Centers',
        label: 'EDUCATION CENTER · COMING SOON',
        description:
          'A planned way to manage students, courses and payments for education centers.',
        cta: 'Explore what’s coming',
        features: [
          { title: 'Students and groups', description: 'Organize students, groups and courses.' },
          {
            title: 'Teachers and attendance',
            description: 'Manage teachers and track attendance.',
          },
          { title: 'Payments and reports', description: 'Payment status and center reports.' },
        ],
      },
      construction: {
        name: 'Balancy Space for Construction',
        label: 'CONSTRUCTION · COMING SOON',
        description: 'A workspace for projects, materials and expenses is in development.',
        cta: 'Explore what’s coming',
        features: [
          {
            title: 'Projects and contracts',
            description: 'Project, client and contract information.',
          },
          { title: 'Materials and team', description: 'Materials tracking and employee activity.' },
          { title: 'Expenses and finance', description: 'Project expenses and financial control.' },
        ],
      },
      service: {
        name: 'Balancy Space for Service Businesses',
        label: 'SERVICE BUSINESS · COMING SOON',
        description: 'A new workspace for customers, services and orders is in development.',
        cta: 'Explore what’s coming',
        features: [
          {
            title: 'Customers and services',
            description: 'Manage a service catalog and customer details.',
          },
          { title: 'Orders and team', description: 'Track orders and employee activity.' },
          { title: 'Expenses and finance', description: 'Follow expenses and financial position.' },
        ],
      },
    },
  },
};

export const PRODUCT_ORDER: ProductId[] = [
  'personal',
  'furniture',
  'restaurant',
  'smm',
  'beauty',
  'education',
  'construction',
  'service',
];
