// Built-in example dataset (50 synthetic patients) so new users can try every
// analysis immediately. Loaded on demand from the welcome screen.

// [age, gender, diagnosis, systolic BP, BMI] — null = missing
const ROWS = [
  [72, 1, 2, null, 31.7],
  [73, 2, 2, 145, 30.3],
  [74, 1, 2, 142, 29],
  [36, 2, 1, 102, 24.1],
  [35, null, 1, 114, 22.6],
  [55, 1, 3, 134, 27.1],
  [null, 1, 2, 141, 27.3],
  [47, 1, 1, 113, 20.3],
  [58, 2, null, 135, 24.3],
  [63, 2, 2, 142, 22.7],
  [51, 2, 2, null, 26],
  [47, 2, 2, 140, 23.4],
  [55, 2, 1, 115, 24.3],
  [32, 1, 1, 104, 21.8],
  [39, 2, 3, 125, 31.3],
  [70, 2, 3, 126, 28.8],
  [51, 1, 1, null, 24.8],
  [72, 1, 2, 144, 29.7],
  [50, 2, 3, 135, 26.6],
  [50, 2, 1, 107, null],
  [72, 2, 3, 141, 31.1],
  [48, 2, 2, 149, 31.2],
  [69, 2, 2, 135, 23.1],
  [47, 1, null, 123, 27.4],
  [37, 1, 3, 136, 33.2],
  [46, 2, 2, 147, 31.5],
  [71, 1, 2, 148, 31.6],
  [57, 2, 2, 146, 32],
  [66, 1, 2, 151, 26.5],
  [36, 1, null, 131, 25.2],
  [69, 1, 3, 131, 25.1],
  [46, 1, 3, 124, 34.1],
  [70, 1, null, 142, 24.8],
  [66, 2, 3, 128, 32.2],
  [33, null, 1, 115, 23.7],
  [38, 2, 3, 134, 28.5],
  [35, 1, 3, 123, 25.6],
  [33, 1, 1, 106, 19.7],
  [65, 1, 2, 140, 24.8],
  [60, 1, 3, 126, null],
  [23, 2, 1, 106, 19.6],
  [51, 2, null, 145, null],
  [18, 2, 1, 110, 20.2],
  [45, 1, 1, 116, 19.5],
  [21, 1, 1, 100, 23.4],
  [75, 1, 2, 151, 27],
  [41, 1, 2, 148, 22.8],
  [22, 1, 1, 106, 21.1],
  [null, 2, 1, 103, 22.5],
  [48, 1, 3, 128, 31.7],
];

const LABELS = {
  ar: {
    age: 'العمر', gender: 'الجنس', diagnosis: 'التشخيص', sbp: 'ضغط الدم الانقباضي', bmi: 'مؤشر كتلة الجسم',
    male: 'ذكر', female: 'أنثى', healthy: 'سليم', hypertension: 'ارتفاع ضغط الدم', diabetes: 'السكري',
  },
  en: {
    age: 'Age', gender: 'Gender', diagnosis: 'Diagnosis', sbp: 'Systolic blood pressure', bmi: 'Body mass index',
    male: 'Male', female: 'Female', healthy: 'Healthy', hypertension: 'Hypertension', diabetes: 'Diabetes',
  },
};

/** Variables + cases in the dataset store's shape, labelled in `lang`. */
export function buildSampleDataset(lang = 'ar') {
  const L = LABELS[lang] ?? LABELS.ar;
  const variable = (id, name, label, type, measure, valueLabels = {}) => ({
    id, name, label, type, measure, valueLabels, missingValues: [],
  });
  const variables = [
    variable('s-age', 'age', L.age, 'numeric', 'scale'),
    variable('s-gender', 'gender', L.gender, 'categorical', 'nominal', { 1: L.male, 2: L.female }),
    variable('s-diag', 'diagnosis', L.diagnosis, 'categorical', 'nominal', { 1: L.healthy, 2: L.hypertension, 3: L.diabetes }),
    variable('s-sbp', 'sbp', L.sbp, 'numeric', 'scale'),
    variable('s-bmi', 'bmi', L.bmi, 'numeric', 'scale'),
  ];
  const cases = ROWS.map((r, i) => ({
    id: `sample-${i + 1}`,
    values: Object.fromEntries(variables.map((v, j) => [v.id, r[j]])),
  }));
  return { variables, cases };
}
