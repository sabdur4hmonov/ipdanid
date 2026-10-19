import type { TutorialWords } from "../tutorial-i18n";
export type TutorialId = "paper" | "cardboard" | "ebru";
type Lesson = {
  title: TutorialWords;
  materials: TutorialWords;
  minutes: number;
  steps: readonly TutorialWords[];
};
// Original instructions and numeric diagrams. Version changes require a new
// registry entry: saved projects refer to this immutable content revision.
export const TUTORIALS = {
  paper: {
    title: [
      "Bolalar uchun qog‘oz garmon",
      "Бумажная гармошка для детей",
      "Kids paper accordion",
    ],
    minutes: 20,
    materials: [
      "150 × 210 mm yupqa qog‘oz, chizg‘ich, qalam va rangli qalamlar. Oldindan shu o‘lchamda tayyorlangan qog‘oz ishlating.",
      "Тонкая бумага 150 × 210 мм, линейка, простой и цветные карандаши. Подготовьте бумагу нужного размера заранее.",
      "Thin 150 × 210 mm paper, ruler, pencil and colored pencils. Use a sheet already cut to this size.",
    ],
    steps: [
      [
        "Qog‘ozning 210 mm tomonini chapdan o‘ngga qo‘ying. Ikki uzun chetida har 15 mmda belgilang: 15, 30, …, 195 mm. Jami 13 chiziq, 14 bo‘lak.",
        "Расположите сторону 210 мм горизонтально. Отметьте оба длинных края через 15 мм: 15, 30, …, 195 мм. Всего 13 сгибов и 14 полос.",
        "Place the 210 mm edge horizontally. Mark both long edges every 15 mm: 15, 30, …, 195 mm. There are 13 creases and 14 panels.",
      ],
      [
        "Qarama-qarshi belgilarni chizg‘ich bilan ulang. Har 15 × 150 mm bo‘lakni xohlagan rangga bo‘yang; qog‘ozni ho‘llamang.",
        "Соедините парные отметки линейкой. Раскрасьте полосы 15 × 150 мм карандашами, не смачивая бумагу.",
        "Join matching marks with a ruler. Color the 15 × 150 mm panels with pencils, keeping the paper dry.",
      ],
      [
        "Chap chetdagi birinchi 15 mm bo‘lakni birinchi chiziq bo‘yicha ichkariga buklang. Qirralarni tenglab, buklamani barmoq bilan bosing.",
        "Согните первую полосу 15 мм внутрь по первой линии. Совместите края и прижмите сгиб пальцами.",
        "Fold the first 15 mm panel inward on the first line. Align the edges and press the crease with your fingers.",
      ],
      [
        "Qog‘ozni ag‘daring va ikkinchi chiziqdan teskari buklang. Navbat bilan ichkari va tashqariga buklab, barcha 13 chiziqni tugating.",
        "Переверните лист и согните вторую линию в обратную сторону. Чередуйте направления на всех 13 линиях.",
        "Turn the sheet over and fold the second line in the opposite direction. Alternate the direction through all 13 creases.",
      ],
      [
        "Yig‘ilgan garmonni tekislang. So‘ng sekin oching: qo‘shni bo‘laklar taxminan to‘g‘ri burchak hosil qilsin. Har bo‘lak eni 15 mm qoladi.",
        "Прижмите собранную гармошку, затем осторожно раскройте. Соседние полосы образуют примерно прямой угол; ширина каждой остаётся 15 мм.",
        "Press the folded accordion, then gently spread it. Neighboring panels should make roughly right angles; every panel stays 15 mm wide.",
      ],
      [
        "150 mmli qirralarni tik qo‘yib, stol ustida zigzag ko‘rinishida turg‘azing. Ag‘darilsa, biroz yoping. O‘zingiz chizgan naqshni tomosha qiling.",
        "Поставьте гармошку вертикально краями 150 мм на стол. Если падает, немного сложите. Рассмотрите свой рисунок.",
        "Stand the 150 mm edges upright on the table as a zigzag display. Close it slightly if it tips. Enjoy your own drawing.",
      ],
    ],
  },
  cardboard: {
    title: ["Karton quticha", "Картонный лоток", "Cardboard tray"],
    minutes: 30,
    materials: [
      "90 × 90 mm karton (0.3–0.8 mm), chizg‘ich, qalam, qaychi va qog‘oz yelimi. Bola kesishda kattadan yordam olsin. Taglik 50 × 50 mm, devor 20 mm; qalinlik buklanganda ichki o‘lchamni ozgina kamaytiradi.",
      "Картон 90 × 90 мм толщиной 0,3–0,8 мм, линейка, карандаш, ножницы, клей для бумаги. Детям нужна помощь взрослого при резке. Дно 50 × 50 мм, стенки 20 мм; сгибы немного уменьшают внутренний размер.",
      "90 × 90 mm cardstock, 0.3–0.8 mm thick; ruler, pencil, scissors and paper glue. An adult helps children cut. The nominal base is 50 × 50 mm with 20 mm walls; bends slightly reduce the inside size.",
    ],
    steps: [
      [
        "Andozani 100% chop eting va 50 mm belgini tekshiring. Karton ustiga ko‘chiring: o‘rtada 50 × 50 mm taglik, to‘rt yonida 20 mm devor.",
        "Распечатайте шаблон в масштабе 100% и проверьте отметку 50 мм. Перенесите на картон: дно 50 × 50 мм и четыре стенки 20 мм.",
        "Print the template at 100% and check the 50 mm mark. Trace it onto cardstock: a 50 × 50 mm base and four 20 mm walls.",
      ],
      [
        "Faqat tashqi qora chiziqdan kesing. Yuqori va pastki devorlarning ikki yonidagi 6 mmli to‘rtta yelim qulog‘ini saqlang. Ko‘k chiziqlar kesilmaydi.",
        "Вырежьте по внешнему чёрному контуру. Сохраните четыре клапана шириной 6 мм у верхней и нижней стенок. Синие линии не разрезайте.",
        "Cut only along the outside black outline. Keep the four 6 mm glue tabs beside the top and bottom walls. Leave the blue crease lines intact.",
      ],
      [
        "Chizg‘ich yonida to‘rtta devorni taglikka nisbatan 90° ichkariga buklang. O‘tkir pichoq kerak emas; buklamani barmoq bilan bosing.",
        "С помощью линейки согните четыре стенки внутрь на 90° к дну. Прижмите сгибы пальцами, без острого ножа.",
        "Use the ruler to fold all four walls inward at 90° to the base. Press the creases with your fingers.",
      ],
      [
        "Yuqori va pastki devorlarning to‘rtta qulog‘ini ichkariga buklang. Avval yelimsiz yig‘ib, quloqlar chap va o‘ng devor ichida turishini tekshiring.",
        "Согните четыре клапана внутрь. Соберите насухо: клапаны должны оказаться внутри левой и правой стенок.",
        "Fold the four tabs inward. Dry-fit the tray with the tabs inside the left and right walls.",
      ],
      [
        "Quloqlarning tashqi tomoniga ozgina yelim surting. Chap va o‘ng devorni ularga bosing. Burchaklarni tekis tutib, yelim yorlig‘idagi vaqtgacha quriting.",
        "Нанесите немного клея снаружи клапанов. Прижмите к ним левую и правую стенки. Держите углы ровно и сушите по инструкции клея.",
        "Apply a little glue to the outside of the tabs. Press the left and right walls against them. Keep the corners square and let the glue dry for its labelled time.",
      ],
      [
        "Qutichani stolga qo‘ying. Barcha burchak yopishganini tekshiring va yengil qog‘oz buyumlar uchun ishlating. Buklama va yelimni avval ortiqcha kartonda sinang.",
        "Поставьте лоток на стол. Проверьте склеенные углы и используйте для лёгких бумажных предметов. Сначала испытайте сгиб и клей на обрезке.",
        "Set the tray on the table. Check that all corners are bonded and use it for light paper items. Test the bend and glue on a scrap first.",
      ],
    ],
  },
  ebru: {
    title: [
      "Ebru: rang tomchilari",
      "Эбру: цветные капли",
      "Ebru: color drops",
    ],
    minutes: 35,
    materials: [
      "Bir-biriga mos tayyor Ebru vannasi va bo‘yoqlari, ishlab chiqaruvchi tavsiya qilgan qog‘oz, tomizgich yoki mo‘yqalam, qog‘ozdan kattaroq sayoz lagan, eski qog‘oz tasma va quritish joyi. Aralashma va qurish vaqtini mahsulot yo‘riqnomasidan oling.",
      "Готовая ванна и краски для эбру одной совместимой системы, рекомендованная бумага, пипетка или кисть, неглубокий лоток больше листа, полоски ненужной бумаги и место для сушки. Пропорции и время сушки берите из инструкции материалов.",
      "A matched ready-to-use Ebru bath and marbling paints, supplier-recommended paper, dropper or brush, a shallow tray larger than the sheet, scrap paper strips and a drying area. Follow the material instructions for preparation and drying times.",
    ],
    steps: [
      [
        "Stolni qoplang va laganni tekis qo‘ying. Tayyor vannani mahsulot yo‘riqnomasidagi chuqurlikkacha quying. Pufaklar tinishini kuting.",
        "Защитите стол и выровняйте лоток. Налейте готовую ванну до глубины из инструкции. Дождитесь исчезновения пузырьков.",
        "Cover the table and level the tray. Pour the prepared bath to the depth stated by its supplier. Wait for bubbles to settle.",
      ],
      [
        "Bo‘yoqni ko‘rsatmasiga muvofiq tayyorlang. Burchakka bitta sinov tomchi qo‘ying: u yuzada yoyilishi kerak. Cho‘ksa yoki yoyilmasa, material yo‘riqnomasiga qayting.",
        "Подготовьте краску по инструкции. Проверьте одну каплю в углу: она должна растекаться по поверхности. Если тонет или не растекается, проверьте рекомендации материалов.",
        "Prepare the paint as directed. Test one drop in a corner: it should spread on the surface. If it sinks or does not spread, check the material instructions.",
      ],
      [
        "Birinchi rangni bir necha alohida nuqtaga sekin tomizing. Tomchilar orasida bo‘sh joy qoldiring. Chizma faqat joylashuv namunasi; rang haqiqiy vannada boshqacha yoyiladi.",
        "Спокойно нанесите первый цвет отдельными каплями с промежутками. Схема показывает расположение; в настоящей ванне краска растекается иначе.",
        "Gently place separate drops of the first color, leaving gaps. The diagram suggests placement; real paint spreads differently in the bath.",
      ],
      [
        "Ikkinchi rangni ayrim tomchilar ichiga qo‘shing. Bu oddiy toshsimon naqsh uchun yuzani aralashtirmang. Qog‘ozga o‘tkazishdan oldin naqshni ko‘ring.",
        "Добавьте второй цвет в некоторые капли. Для простого каменного узора не перемешивайте поверхность. Осмотрите рисунок перед переносом.",
        "Add the second color inside some of the first drops. Leave the surface unstirred for a simple stone pattern. Check the pattern before transferring.",
      ],
      [
        "Qog‘ozni ikki chetidan ushlang. Bir chetini tekkizib, asta qolganini tushiring; orasida havo qolmasin. Tegish va kutish vaqtini qog‘oz hamda bo‘yoq yo‘riqnomasiga qarab belgilang.",
        "Возьмите лист за два края. Коснитесь одной стороной и плавно опустите остальное, не оставляя воздуха. Время контакта определяйте по инструкции бумаги и краски.",
        "Hold the sheet by two edges. Touch one edge down, then gently lower the rest without trapping air. Use the contact time recommended for your paper and paints.",
      ],
      [
        "Bir chetidan sekin ko‘taring va ortiqcha suyuqlikni laganga oqizing. Yo‘riqnoma talab qilsa chaying. Naqshga tegmasdan tekis joyda quriting.",
        "Медленно поднимите за край и дайте жидкости стечь в лоток. Промойте, только если требует инструкция. Сушите ровно, не касаясь рисунка.",
        "Slowly lift one edge and let excess liquid drain into the tray. Rinse if the material instructions require it. Dry flat without touching the pattern.",
      ],
      [
        "Keyingi varaqdan oldin eski qog‘oz tasmani suv yuzasi bo‘ylab yurgizib, bo‘yoq qoldig‘ini oling. Materialni saqlash va tozalash ko‘rsatmasiga amal qiling.",
        "Перед следующим листом проведите полоской ненужной бумаги по поверхности и снимите остатки краски. Храните материалы и очищайте инструменты по инструкции.",
        "Before the next sheet, skim the surface with a scrap-paper strip to remove paint residue. Follow the material instructions for storage and cleanup.",
      ],
    ],
  },
} as const satisfies Record<TutorialId, Lesson>;
