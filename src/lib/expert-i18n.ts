// Hebrew error-message mapper for the Expert Console. The API returns
// JSON like {error: 'invalid_body', details: {fieldErrors: {slug: [...]}}}
// — this maps known shapes to a single human-readable Hebrew sentence so
// the form can render it cleanly instead of a raw blob.

interface ApiErrorBody {
  error?: string;
  details?: {
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
  };
  message?: string;
}

const FIELD_HE: Record<string, string> = {
  slug: 'מזהה (slug)',
  name: 'שם',
  definition: 'הגדרה',
  description: 'תיאור',
  source_tier: 'דרגת מקור',
  confidence: 'ודאות',
  related_sources: 'מקורות קשורים',
  last_reviewed_at: 'תאריך סקירה אחרון',
  // hub_questions
  asset_template_id: 'תבנית נכס',
  order_index: 'סדר',
  question_text: 'נוסח השאלה',
  question_type: 'סוג שאלה',
  choices: 'אפשרויות',
  depends_on: 'תלוי בשאלה',
  help_text: 'טקסט עזרה',
  required: 'חובה',
  // hub_document_templates
  body: 'תוכן',
  variables: 'משתנים',
  output_format: 'פורמט פלט',
  // hub_control_playbooks
  cadence: 'תדירות',
  owner_role: 'תפקיד אחראי',
  checklist: 'רשימת בדיקה',
  // hub_gap_rules
  severity: 'חומרה',
  rule_dsl: 'כלל זיהוי',
  remediation_text: 'טיפול מומלץ',
  continuation_service_ids: 'שירותי המשך',
  // hub_continuation_services
  service_kind: 'סוג שירות',
  price_model: 'מודל תמחור',
  estimated_price_text: 'מחיר משוער',
};

export function formatExpertError(status: number, rawBody: string): string {
  let body: ApiErrorBody | null = null;
  try {
    body = JSON.parse(rawBody) as ApiErrorBody;
  } catch {
    // Not JSON — fall through to raw fallback
  }

  if (status === 403) {
    return 'אין הרשאה — חשבון זה אינו מסומן כאוצר.';
  }
  if (status === 404) {
    return 'התבנית לא נמצאה.';
  }
  if (status === 401) {
    return 'אינך מחובר. רעננו את הדף והתחברו מחדש.';
  }

  if (body) {
    if (status === 409 && typeof body.error === 'string' && body.error.toLowerCase().includes('slug')) {
      return 'מזהה (slug) כבר קיים. בחרו מזהה אחר.';
    }

    if (status === 400 && body.error === 'invalid_body' && body.details?.fieldErrors) {
      const fe = body.details.fieldErrors;
      const firstField = Object.keys(fe).find(k => fe[k] && fe[k].length > 0);
      if (firstField) {
        const labelHe = FIELD_HE[firstField] ?? firstField;
        const detail = fe[firstField]?.[0] ?? '';
        if (firstField === 'slug' && detail.includes('lowercase')) {
          return `מזהה (slug) לא תקין: אותיות לועזיות קטנות, ספרות וקו תחתון בלבד; חייב להתחיל באות.`;
        }
        return `שדה לא תקין — ${labelHe}: ${detail || 'ערך חסר או לא חוקי'}.`;
      }
      return 'אחד השדות אינו תקין. בדקו את הטופס ונסו שוב.';
    }

    if (typeof body.error === 'string' && body.error.length > 0) {
      return `שגיאה: ${body.error}`;
    }
  }

  if (status >= 500) {
    return 'תקלת שרת. נסו שוב, ואם הבעיה חוזרת — דווחו לתמיכה.';
  }

  // Unknown shape — show truncated raw so we don't lose debug info entirely.
  const snippet = rawBody.slice(0, 200);
  return `שגיאה (${status}): ${snippet}`;
}
