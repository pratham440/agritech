// English strings are the keys; add a language by adding another map.
const hi = {
  Dashboard: 'डैशबोर्ड', 'My farms': 'मेरे खेत', Crops: 'फसलें', Shop: 'दुकान', Community: 'समुदाय', Admin: 'एडमिन',
  'Log out': 'लॉग आउट', 'Log in': 'लॉग इन', 'Create account': 'खाता बनाएँ', Email: 'ईमेल', Password: 'पासवर्ड', Name: 'नाम',
  'Add farm': 'खेत जोड़ें', 'Add crop': 'फसल जोड़ें', 'Delete': 'हटाएँ', 'Save': 'सहेजें', 'Pest alerts': 'कीट चेतावनी',
  'Next 7 days': 'अगले 7 दिन', 'Place order': 'ऑर्डर करें', 'Ask an expert': 'विशेषज्ञ से पूछें', 'Forum': 'फोरम',
  'Check soil': 'मिट्टी जाँचें', 'Temperature': 'तापमान', 'Humidity': 'नमी', 'Wind': 'हवा', Reply: 'जवाब दें',
};
const dict = { en: {}, hi };
export const translator = (lang) => (k) => dict[lang]?.[k] || k;
export const languages = { en: 'English', hi: 'हिन्दी' };
