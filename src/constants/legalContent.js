/**
 * Full text for the in-app Privacy Policy & Terms of Service screen.
 * Kept as plain data (not translations.js) since it's long-form content
 * rendered by a single dedicated screen (LegalScreen), not short UI
 * strings looked up all over the app.
 *
 * getLegalContent('privacy' | 'terms', 'ar' | 'en') -> { title, updated, sections }
 * Each section is { heading, body } and body may contain '\n\n' paragraph
 * breaks, which LegalScreen splits and renders as separate <Text> blocks.
 */

const CONTACT_EMAIL = 'dev.alihalim@gmail.com';
const DEVELOPER_NAME = 'Ali Halim';
const LAST_UPDATED = { en: 'August 13, 2026', ar: '13 أغسطس 2026' };

const privacy = {
  en: {
    title: 'Privacy Policy',
    updated: `Last updated: ${LAST_UPDATED.en}`,
    intro: `This Privacy Policy explains how the A app ("the App"), developed by ${DEVELOPER_NAME}, handles your information. Your data stays on your device unless you deliberately turn on an optional feature that requires an internet connection.`,
    sections: [
      {
        heading: '1. The Short Version',
        body: 'A is designed to work entirely on your device. There is no backend server operated by us, no user account, and no login. Your data is not sent to us or to any third party as part of the App\'s normal operation.',
      },
      {
        heading: '2. Data Stored on Your Device',
        body: 'While you use the App, the following is stored locally on your device only: tasks, habits, challenges, favorites, and archived items; notes (text, images, audio attachments, links, tags); planning data, wishlist items, and mood entries; app settings and customization; and internal usage statistics used only to show streaks and charts inside the App.\n\nAll of this data is encrypted (AES-256) on your device, using a key generated once and kept in your device\'s secure hardware-backed keystore. No one can read your data by simply accessing the App\'s storage files without going through your device\'s own security system.',
      },
      {
        heading: '3. Optional Features That Require the Internet',
        body: 'These features are off by default and only activate if you turn them on yourself:\n\nGitHub Backup — if enabled, you provide your own GitHub access token and repository. The App uploads a backup directly from your device to your own GitHub account, optionally protected with a password you choose. Your token is stored securely on your device only.\n\nTMDb Integration — if enabled, you provide your own TMDb API key, and your device talks directly to TMDb\'s servers, subject to TMDb\'s own privacy policy.\n\nManual Export & Sharing — you can export your data as a JSON file to a destination you choose, only when you explicitly initiate it.',
      },
      {
        heading: '4. Device Permissions Used by the App',
        body: 'Notifications — to remind you about tasks, habits, timers, and daily quotes.\n\nExact Alarm Scheduling — so reminders arrive at the precise time you set.\n\nBoot Completed — to reschedule your reminders after your device restarts.\n\nBiometric Authentication — an optional lock for notes or the App, handled entirely by your device\'s OS; the App never sees or stores your fingerprint or face data.\n\nAudio Playback — to play a sound when a timer completes (no recording).\n\nHome Screen Widgets — to show a summary of your tasks and habits; all data shown is local only.',
      },
      {
        heading: '5. Do We Use Tracking, Ads, or Analytics?',
        body: 'No. The App does not include any analytics or behavioral tracking, any advertising, or any crash-reporting tool that sends data to a third party. We do not sell or share your data with anyone for commercial or advertising purposes.',
      },
      {
        heading: '6. Data Security',
        body: 'Your data is encrypted locally (AES-256) with an integrity check (HMAC) that detects tampering. Sensitive credentials (like your GitHub token and TMDb key) are stored in your device\'s secure keystore, not in regular storage. If your device is lost or the App is uninstalled without a backup, locally stored data is permanently lost — enable backup if your data matters to you.',
      },
      {
        heading: '7. Children\'s Privacy',
        body: 'The App is not directed at children under 13, and it does not specifically collect personal information from any age group, since all data remains local to the device.',
      },
      {
        heading: '8. Your Rights and Choices',
        body: 'You can delete any data from within the App at any time, uninstall the App to remove all associated local data, and disable or unlink GitHub/TMDb integration from Settings at any time.',
      },
      {
        heading: '9. Changes to This Policy',
        body: 'We may update this Privacy Policy from time to time to reflect changes to the App\'s features. The "Last updated" date above will be revised whenever a material change is made.',
      },
      {
        heading: '10. Contact Us',
        body: `For any question about this Privacy Policy or your data: ${CONTACT_EMAIL}`,
      },
    ],
  },
  ar: {
    title: 'سياسة الخصوصية',
    updated: `آخر تحديث: ${LAST_UPDATED.ar}`,
    intro: `يشرح هذا المستند كيف يتعامل تطبيق A مع بياناتك، وهو من تطوير ${DEVELOPER_NAME}. بياناتك تبقى في جهازك، إلا إذا فعّلت بنفسك ميزة اختيارية تتطلّب اتصالًا بالإنترنت.`,
    sections: [
      {
        heading: '1. الفكرة الأساسية',
        body: 'تطبيق A مصمم ليعمل محليًا بالكامل على جهازك. لا يملك التطبيق خادمًا خلفيًا خاصًا به، ولا يوجد حساب مستخدم أو تسجيل دخول، ولا تُرسَل بياناتك إلى مطوّر التطبيق أو إلى أي طرف ثالث كجزء من التشغيل العادي للتطبيق.',
      },
      {
        heading: '2. البيانات التي يخزّنها التطبيق على جهازك',
        body: 'يقوم التطبيق بتخزين المهام والعادات والتحديات والمفضلة والأرشيف؛ الملاحظات (نصوص، صور، مرفقات صوتية، روابط، وسوم)؛ بيانات التخطيط وقوائم الرغبات والحالة المزاجية؛ إعدادات التطبيق؛ وإحصاءات الاستخدام الداخلية — كل ذلك محليًا على جهازك فقط.\n\nجميع هذه البيانات تُخزَّن مشفّرة (AES-256) بمفتاح يُولَّد مرة واحدة ويُحفظ في نظام الحماية الآمن للجهاز. لا يستطيع أحد قراءة بياناتك دون المرور عبر نظام حماية جهازك نفسه.',
      },
      {
        heading: '3. الميزات الاختيارية التي تتطلّب اتصالًا بالإنترنت',
        body: 'هذه الميزات معطّلة افتراضيًا ولا تعمل إلا إذا فعّلتها بنفسك:\n\nالنسخ الاحتياطي عبر GitHub — تُدخل رمز وصول شخصي واسم مستودع خاصين بحسابك؛ يرفع التطبيق نسخة من بياناتك مباشرة من جهازك إلى حسابك، مع إمكانية حمايتها بكلمة مرور إضافية. الرمز يُخزَّن بأمان على جهازك فقط.\n\nربط TMDb — تُدخل مفتاح API خاصًا بحسابك، ويتواصل جهازك مباشرة مع خوادم TMDb وفق سياستهم الخاصة.\n\nالتصدير والمشاركة اليدوية — يمكنك تصدير بياناتك كملف JSON لمكان تختاره، فقط بأمر منك.',
      },
      {
        heading: '4. صلاحيات الجهاز التي يطلبها التطبيق',
        body: 'الإشعارات — لتذكيرك بالمهام والعادات والمؤقّتات والاقتباسات اليومية.\n\nالتنبيه الدقيق للمنبّهات — لضمان وصول التذكيرات في وقتها بدقة.\n\nالتشغيل بعد إعادة التشغيل — لإعادة جدولة تذكيراتك تلقائيًا.\n\nالمصادقة البيومترية — قفل اختياري للملاحظات أو التطبيق، يتم بالكامل عبر نظام تشغيل جهازك، والتطبيق لا يرى بصمتك أو وجهك ولا يخزّنهما إطلاقًا.\n\nتشغيل الصوت — لتشغيل نغمة عند انتهاء المؤقّت فقط (لا تسجيل).\n\nويدجت الشاشة الرئيسية — لعرض ملخص مهامك وعاداتك؛ البيانات المعروضة محلية بالكامل.',
      },
      {
        heading: '5. هل يستخدم التطبيق التتبع أو الإعلانات أو التحليلات؟',
        body: 'لا. التطبيق لا يحتوي على أي أدوات تحليلات أو تتبع سلوكي، ولا إعلانات، ولا أدوات تتبّع أعطال ترسل بيانات لطرف خارجي. لا يتم بيع بياناتك أو مشاركتها مع أي طرف ثالث لأغراض تجارية أو إعلانية.',
      },
      {
        heading: '6. أمان البيانات',
        body: 'بياناتك مشفّرة محليًا (AES-256) مع توقيع تحقق (HMAC) يكشف أي تلاعب. الرموز الحساسة (رمز GitHub ومفتاح TMDb) تُحفظ في المخزن الآمن للجهاز وليس في تخزين عادي. في حال فقدان الجهاز أو حذف التطبيق دون نسخة احتياطية، تُفقد البيانات المحلية نهائيًا — فعّل النسخ الاحتياطي إذا كانت بياناتك مهمة لك.',
      },
      {
        heading: '7. بيانات الأطفال',
        body: 'التطبيق غير موجّه للأطفال دون سن 13 عامًا، ولا يجمع بيانات شخصية تحديدًا من أي فئة عمرية، لأن جميع البيانات تبقى محلية على الجهاز.',
      },
      {
        heading: '8. حقوقك',
        body: 'يمكنك حذف أي بيانات من داخل التطبيق في أي وقت، وحذف التطبيق بالكامل لمسح جميع بياناته المحلية، وتعطيل أو حذف ربط GitHub/TMDb من الإعدادات في أي وقت.',
      },
      {
        heading: '9. تغييرات على هذه السياسة',
        body: 'قد يتم تحديث هذه السياسة من وقت لآخر لمواكبة أي تغييرات في ميزات التطبيق. سيتم تحديث تاريخ "آخر تحديث" أعلاه عند إجراء أي تعديل جوهري.',
      },
      {
        heading: '10. التواصل معنا',
        body: `لأي استفسار بخصوص هذه السياسة أو خصوصية بياناتك: ${CONTACT_EMAIL}`,
      },
    ],
  },
};

const terms = {
  en: {
    title: 'Terms of Service',
    updated: `Last updated: ${LAST_UPDATED.en}`,
    intro: `These Terms govern your use of the A app, developed by ${DEVELOPER_NAME}. By using the App, you agree to these Terms.`,
    sections: [
      {
        heading: '1. About the App',
        body: 'A is a task, habit, notes, and focus productivity app that runs primarily locally on your device. The App does not require a central account. Any internet-connected features (GitHub backup, TMDb integration) are entirely optional and rely on credentials you provide yourself.',
      },
      {
        heading: '2. License and Permitted Use',
        body: 'We grant you a personal, non-exclusive, non-transferable license to use the App on your own devices for your own purposes. You may not redistribute, resell, or rent the App without permission; reverse-engineer it beyond what applicable law explicitly allows; use it for any unlawful or harmful purpose; or claim ownership of it.',
      },
      {
        heading: '3. Your Responsibility for Your Data',
        body: 'Because your data lives only on your device, you are solely responsible for backing it up if it matters to you — via the optional GitHub backup feature or manual export. If you uninstall the App, lose your device, or reset it, we may not be able to recover your data, since we keep no copy of it on any server. If you use GitHub backup, you\'re responsible for keeping your access token confidential.',
      },
      {
        heading: '4. Optional Internet-Connected Features',
        body: 'GitHub and TMDb are third-party services with their own terms and privacy policies. We are not responsible for how they handle your data once it reaches them, and you are responsible for complying with their own terms when you use them through the App.',
      },
      {
        heading: '5. Intellectual Property',
        body: `All rights to the App's design, code, name, and icon belong to ${DEVELOPER_NAME}, except for open-source libraries used within it, which remain subject to their own licenses. Your content (tasks, notes, etc.) remains entirely your own property.`,
      },
      {
        heading: '6. Disclaimer of Warranties',
        body: 'The App is provided "as is," without warranties of any kind, express or implied. We do not guarantee uninterrupted or error-free operation on all devices at all times. Because the App provides personal reminders, we are not liable for damages from relying on it exclusively without your own backup arrangements, especially for time-sensitive matters.',
      },
      {
        heading: '7. Limitation of Liability',
        body: 'To the maximum extent permitted by law, the developer is not liable for indirect, incidental, or consequential damages arising from your use of the App — including data loss, a missed task due to a technical failure, or any issue arising from a linked third-party service.',
      },
      {
        heading: '8. Updates to the App and These Terms',
        body: 'The App may be updated to add features or fix issues. These Terms may also be updated to reflect material changes; continued use of the App after such an update means you accept the revised Terms.',
      },
      {
        heading: '9. Termination',
        body: 'You may stop using the App at any time by uninstalling it. We may discontinue support or updates in the future without prior obligation; your locally stored data remains on your device regardless.',
      },
      {
        heading: '10. Governing Law',
        body: 'These Terms are governed by the laws applicable in the developer\'s country of residence, unless mandatory local law in your jurisdiction requires otherwise.',
      },
      {
        heading: '11. Contact Us',
        body: `For any question about these Terms: ${CONTACT_EMAIL}`,
      },
    ],
  },
  ar: {
    title: 'الشروط والأحكام',
    updated: `آخر تحديث: ${LAST_UPDATED.ar}`,
    intro: `تُنظّم هذه الشروط استخدامك لتطبيق A، وهو من تطوير ${DEVELOPER_NAME}. باستخدامك للتطبيق، فإنك توافق على هذه الشروط.`,
    sections: [
      {
        heading: '1. طبيعة التطبيق',
        body: 'تطبيق A هو تطبيق لإدارة المهام والعادات والملاحظات والتركيز، يعمل بشكل أساسي محليًا على جهازك. لا يوفر التطبيق حسابًا مركزيًا؛ أي ميزات متصلة بالإنترنت (النسخ الاحتياطي عبر GitHub أو TMDb) اختيارية بالكامل وتعتمد على بيانات تُدخلها أنت بنفسك.',
      },
      {
        heading: '2. الترخيص والاستخدام المسموح به',
        body: 'نمنحك ترخيصًا شخصيًا غير حصري لاستخدام التطبيق على أجهزتك الشخصية. يُمنع إعادة توزيع التطبيق أو بيعه دون إذن، ومحاولة هندسته العكسية خارج ما تسمح به القوانين، واستخدامه لغرض غير قانوني، وانتحال ملكيته.',
      },
      {
        heading: '3. مسؤوليتك عن بياناتك',
        body: 'بما أن بياناتك تُخزَّن محليًا على جهازك فقط، فأنت المسؤول الوحيد عن أخذ نسخ احتياطية منها إذا كانت مهمة لك — عبر GitHub أو التصدير اليدوي. في حال حذف التطبيق أو فقدان الجهاز أو إعادة ضبطه، قد لا نتمكن من استرجاع بياناتك لأننا لا نحتفظ بأي نسخة منها على خوادمنا. عند استخدام النسخ الاحتياطي عبر GitHub، أنت مسؤول عن سرية رمز الوصول الخاص بك.',
      },
      {
        heading: '4. الميزات الاختيارية المتصلة بالإنترنت',
        body: 'GitHub وTMDb خدمات تابعة لأطراف ثالثة ولها شروطها وسياساتها الخاصة، ولسنا مسؤولين عن كيفية تعاملها مع بياناتك بعد وصولها إليها، وأنت مسؤول عن الالتزام بشروطها عند استخدامها عبر التطبيق.',
      },
      {
        heading: '5. الملكية الفكرية',
        body: `جميع الحقوق المتعلقة بتصميم التطبيق وشيفرته واسمه وأيقونته مملوكة لـ ${DEVELOPER_NAME}، باستثناء المكتبات مفتوحة المصدر التي تخضع لتراخيصها الخاصة. محتواك (مهامك، ملاحظاتك) يبقى ملكًا لك بالكامل.`,
      },
      {
        heading: '6. إخلاء المسؤولية',
        body: 'يُقدَّم التطبيق "كما هو" دون أي ضمانات صريحة أو ضمنية. لا نضمن عملًا دون انقطاع أو أخطاء في كل الأوقات. بما أن التطبيق يقدّم تذكيرات شخصية، فإننا لا نتحمل مسؤولية أضرار ناتجة عن الاعتماد الكلي عليه دون ترتيبات احتياطية من جانبك، خصوصًا في الأمور الحساسة زمنيًا.',
      },
      {
        heading: '7. حدود المسؤولية',
        body: 'إلى أقصى حد يسمح به القانون، لا يتحمل المطوّر مسؤولية أي أضرار غير مباشرة أو تبعية تنشأ عن استخدامك للتطبيق، بما فيها فقدان البيانات، أو فوات مهمة بسبب عطل تقني، أو أي مشكلة تنشأ عن خدمة طرف ثالث مرتبطة بالتطبيق.',
      },
      {
        heading: '8. التحديثات على التطبيق والشروط',
        body: 'قد يتم تحديث التطبيق لإضافة ميزات أو إصلاح أعطال. كما قد تُحدَّث هذه الشروط لتعكس تغييرات جوهرية؛ استمرارك في الاستخدام بعد أي تحديث يُعتبر موافقة ضمنية عليها.',
      },
      {
        heading: '9. إنهاء الاستخدام',
        body: 'يمكنك التوقف عن استخدام التطبيق في أي وقت بحذفه من جهازك. نحتفظ بالحق في التوقف عن دعمه أو تحديثه مستقبلًا، مع بقاء بياناتك المحلية في جهازك بعد أي توقف.',
      },
      {
        heading: '10. القانون الحاكم',
        body: 'تخضع هذه الشروط للقوانين المعمول بها في بلد إقامة المطوّر، ما لم يقتضِ القانون المحلي الإلزامي في بلدك خلاف ذلك.',
      },
      {
        heading: '11. التواصل معنا',
        body: `لأي استفسار بخصوص هذه الشروط: ${CONTACT_EMAIL}`,
      },
    ],
  },
};

const CONTENT = { privacy, terms };

/**
 * @param {'privacy'|'terms'} type
 * @param {'en'|'ar'} language
 */
export function getLegalContent(type, language) {
  const doc = CONTENT[type] || CONTENT.privacy;
  return doc[language] || doc.en;
}

export const LEGAL_CONTACT_EMAIL = CONTACT_EMAIL;
