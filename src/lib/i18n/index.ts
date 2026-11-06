export type LanguageCode = "en" | "ta" | "hi";

export interface TranslationDictionary {
  brand: string;
  tagline: string;
  // Navigation
  myMedicines: string;
  documents: string;
  share: string;
  patients: string;
  upload: string;
  compare: string;
  reviewQueue: string;
  users: string;
  audit: string;
  privacyStatus: string;
  // Statuses
  verified: string;
  pendingReview: string;
  needsClarification: string;
  // Discrepancy Severities
  highSeverity: string;
  mediumSeverity: string;
  lowSeverity: string;
  // Actions
  approve: string;
  reject: string;
  escalate: string;
  confirm: string;
  correct: string;
  manualEntry: string;
  pauseMotion: string;
  playMotion: string;
  simpleMode: string;
  signOut: string;
  signIn: string;
  // Common UI
  sourceDocument: string;
  verbatimInstruction: string;
  lastUpdated: string;
  safetyNotice: string;
  keyboardShortcuts: string;
  accessibilitySettings: string;
}

export const translations: Record<LanguageCode, TranslationDictionary> = {
  en: {
    brand: "MedBridge",
    tagline: "Medication Continuity & Safe Handover",
    myMedicines: "My medicines",
    documents: "Documents",
    share: "Share",
    patients: "Patients",
    upload: "Upload",
    compare: "Compare",
    reviewQueue: "Review queue",
    users: "Users",
    audit: "Audit",
    privacyStatus: "Privacy status",
    verified: "Verified",
    pendingReview: "Pending professional review",
    needsClarification: "Needs clarification",
    highSeverity: "High",
    mediumSeverity: "Medium",
    lowSeverity: "Low",
    approve: "Approve",
    reject: "Reject",
    escalate: "Escalate",
    confirm: "Confirm",
    correct: "Correct",
    manualEntry: "Manual entry",
    pauseMotion: "Pause background motion",
    playMotion: "Play background motion",
    simpleMode: "Simple mode",
    signOut: "Sign out",
    signIn: "Sign in",
    sourceDocument: "Source document",
    verbatimInstruction: "Verbatim instruction",
    lastUpdated: "Last updated",
    safetyNotice: "Synthetic data only. MedBridge never prescribes, substitutes medicines, recommends dose changes or tells anyone to stop medication. Decisions stay with qualified healthcare professionals. Records never leave this server.",
    keyboardShortcuts: "Keyboard shortcuts",
    accessibilitySettings: "Accessibility settings",
  },
  ta: {
    brand: "MedBridge",
    tagline: "மருந்து தொடர்ச்சி மற்றும் பாதுகாப்பான ஒப்படைப்பு",
    myMedicines: "என் மருந்துகள்",
    documents: "ஆவணங்கள்",
    share: "பகிர்",
    patients: "நோயாளிகள்",
    upload: "பதிவேற்று",
    compare: "ஒப்பீடு",
    reviewQueue: "மறுஆய்வு வரிசை",
    users: "பயனர்கள்",
    audit: "தணிக்கை பதிவு",
    privacyStatus: "தனியுரிமை நிலை",
    verified: "சரிபார்க்கப்பட்டது",
    pendingReview: "மருத்துவர் மறுஆய்வில் உள்ளது",
    needsClarification: "தெளிவுபடுத்தல் தேவை",
    highSeverity: "அதி முக்கியம்",
    mediumSeverity: "நடுத்தரம்",
    lowSeverity: "குறைவு",
    approve: "ஒப்புதல் அளி",
    reject: "நிராகரி",
    escalate: "மேல்முறையீடு",
    confirm: "உறுதிப்படுத்து",
    correct: "திருத்து",
    manualEntry: "கைமுறை உள்ளீடு",
    pauseMotion: "அசைவை நிறுத்து",
    playMotion: "அசைவை இயக்கு",
    simpleMode: "எளிய வடிவம்",
    signOut: "வெளியேறு",
    signIn: "உள்நுழை",
    sourceDocument: "மூல ஆவணம்",
    verbatimInstruction: "நேரடி மருந்து வழிமுறை",
    lastUpdated: "கடைசியாக புதுப்பிக்கப்பட்டது",
    safetyNotice: "செயற்கை தரவு மட்டுமே. MedBridge ஒருபோதும் மருந்துகளை பரிந்துரைக்கவோ, மாற்றவோ, அளவை மாற்றவோ இல்லை. முடிவுகள் தகுதிவாய்ந்த நிபுணர்களுக்கே உரியவை.",
    keyboardShortcuts: "விசைப்பலகை குறுக்குவழிகள்",
    accessibilitySettings: "அணுகல்தன்மை அமைப்புகள்",
  },
  hi: {
    brand: "MedBridge",
    tagline: "दवा निरंतरता और सुरक्षित हैंडओवर",
    myMedicines: "मेरी दवाएं",
    documents: "दस्तावेज़",
    share: "साझा करें",
    patients: "मरीज़",
    upload: "अपलोड करें",
    compare: "तुलना करें",
    reviewQueue: "समीक्षा कतार",
    users: "उपयोगकर्ता",
    audit: "ऑडिट लॉग",
    privacyStatus: "गोपनीयता स्थिति",
    verified: "सत्यापित",
    pendingReview: "चिकित्सकीय समीक्षा लंबित",
    needsClarification: "स्पष्टीकरण आवश्यक",
    highSeverity: "उच्च",
    mediumSeverity: "मध्यम",
    lowSeverity: "निम्न",
    approve: "स्वीकृत करें",
    reject: "अस्वीकार करें",
    escalate: "आगे भेजें",
    confirm: "पुष्टि करें",
    correct: "संशोधित करें",
    manualEntry: "मैन्युअल प्रविष्टि",
    pauseMotion: "पृष्ठभूमि गति रोकें",
    playMotion: "पृष्ठभूमि गति चालू करें",
    simpleMode: "सरल मोड",
    signOut: "साइन आउट",
    signIn: "साइन इन",
    sourceDocument: "मूल दस्तावेज़",
    verbatimInstruction: "मूल निर्देश",
    lastUpdated: "अंतिम अद्यतन",
    safetyNotice: "केवल सिंथेटिक डेटा। MedBridge कभी भी दवा का नुस्खा नहीं देता, दवा नहीं बदलता या खुराक बदलने की सिफारिश नहीं करता। सभी निर्णय योग्य स्वास्थ्य पेशेवरों के पास रहते हैं।",
    keyboardShortcuts: "कीबोर्ड शॉर्टकट",
    accessibilitySettings: "पहुंच-योग्यता सेटिंग्स",
  },
};

export function getDictionary(lang: string = "en"): TranslationDictionary {
  if (lang === "ta") return translations.ta;
  if (lang === "hi") return translations.hi;
  return translations.en;
}
