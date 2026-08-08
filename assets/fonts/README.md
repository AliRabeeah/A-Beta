# Fonts for the About screen redesign

الحين شاشة About تستخدم خط بديل (النظام العادي)، مو الخط الأنيق (Fraunces/Manrope) المطلوب بالتصميم — لأن ملفات الخط الحقيقية مو موجودة. هذا الملف يشرح كيف تضيفها.

## وين تجيب الخطوط (مجانية)
1. **Fraunces**: https://fonts.google.com/specimen/Fraunces
   حمّل وحدتين بس: **Regular** و **Italic**
2. **Manrope**: https://fonts.google.com/specimen/Manrope
   حمّل وحدتين بس: **Regular** و **SemiBold**

بكل صفحة، زر **Download family** يحمّل لك ملف مضغوط (zip) فيه كل أوزان الخط — تحتاج بس ٤ ملفات منها إجمالًا (٢ من كل خط).

## وين تحطها بالضبط
حط الملفات الأربعة **بنفس هذا المجلد** (`assets/fonts/`)، وسمّها بالضبط كذا (بدون تغيير):
```
assets/fonts/Fraunces-Regular.ttf
assets/fonts/Fraunces-Italic.ttf
assets/fonts/Manrope-Regular.ttf
assets/fonts/Manrope-SemiBold.ttf
```

## التعديل المطلوب بالكود (خطوتين بس)
افتح ملف `src/screens/AboutScreen.js`، ودور على هذا الجزء بالأعلى:

```js
function useAboutFonts() {
  return useFonts({
    // 'Fraunces-Regular': require('../../assets/fonts/Fraunces-Regular.ttf'),
    // 'Fraunces-Italic': require('../../assets/fonts/Fraunces-Italic.ttf'),
    // 'Manrope-Regular': require('../../assets/fonts/Manrope-Regular.ttf'),
    // 'Manrope-SemiBold': require('../../assets/fonts/Manrope-SemiBold.ttf'),
  });
}
```

**الخطوة ١:** احذف علامة `//` من بداية الأسطر الأربعة (فك التعليق عنها) — تصير كذا:
```js
function useAboutFonts() {
  return useFonts({
    'Fraunces-Regular': require('../../assets/fonts/Fraunces-Regular.ttf'),
    'Fraunces-Italic': require('../../assets/fonts/Fraunces-Italic.ttf'),
    'Manrope-Regular': require('../../assets/fonts/Manrope-Regular.ttf'),
    'Manrope-SemiBold': require('../../assets/fonts/Manrope-SemiBold.ttf'),
  });
}
```

**الخطوة ٢:** بنفس الملف، دور على هذين السطرين (فوق بشوي):
```js
const HEADING_FONT = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const BODY_FONT = undefined; // platform default
```
وغيّرهم لـ:
```js
const HEADING_FONT = 'Fraunces-Regular';
const BODY_FONT = 'Manrope-Regular';
```

هذا كل شي — احفظ، أعد تشغيل التطبيق (rebuild)، وبتشوف الخط الجديد بشاشة About. ما فيه أي تعديل ثاني مطلوب، وما يأثر على أي شاشة ثانية بالتطبيق.
