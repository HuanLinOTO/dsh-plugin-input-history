/**
 * Override dictionaries for the 19 languages better-locale ships. Each
 * dict covers the full `dsh-plugin-input-history` key set (ariaLabel /
 * restoredDraft / noHistory), no placeholders — these are plain strings.
 *
 * Registered with better-locale only (see [index.ts](./index.ts)): the
 * override borrows DSH's English slot, so these render when the user
 * selected an override language AND DSH's active locale is `'en'`. zh-HK /
 * zh-TW / zh-MO have no regional variants for this copy, so the three
 * Traditional Chinese dicts are identical.
 */

import type { InputHistoryKey } from './locales.ts'

const ja: Record<InputHistoryKey, string> = {
  ariaLabel: 'プロンプト履歴のナビゲーション（↑/↓キー）',
  restoredDraft: '編集中の下書きを復元しました',
  noHistory: 'プロンプト履歴はまだありません',
}

const de: Record<InputHistoryKey, string> = {
  ariaLabel: 'Befehlsverlauf-Navigation (Pfeil hoch/runter)',
  restoredDraft: 'In Bearbeitung befindlicher Entwurf wiederhergestellt',
  noHistory: 'Noch kein Befehlsverlauf vorhanden',
}

const fr: Record<InputHistoryKey, string> = {
  ariaLabel: 'Navigation dans l\'historique des invites (flèche haut/bas)',
  restoredDraft: 'Brouillon en cours d\'édition restauré',
  noHistory: 'Pas encore d\'historique d\'invites',
}

const pt: Record<InputHistoryKey, string> = {
  ariaLabel: 'Navegação no histórico de prompts (seta para cima/baixo)',
  restoredDraft: 'Rascunho em edição restaurado',
  noHistory: 'Ainda não há histórico de prompts',
}

const ko: Record<InputHistoryKey, string> = {
  ariaLabel: '프롬프트 기록 탐색 (위/아래 화살표)',
  restoredDraft: '편집 중이던 초안을 복원했습니다',
  noHistory: '아직 프롬프트 기록이 없습니다',
}

const ar: Record<InputHistoryKey, string> = {
  ariaLabel: 'التنقل في سجل الأوامر (السهم لأعلى/لأسفل)',
  restoredDraft: 'تمت استعادة المسودة قيد التحرير',
  noHistory: 'لا يوجد سجل أوامر بعد',
}

const hi: Record<InputHistoryKey, string> = {
  ariaLabel: 'प्रॉम्प्ट इतिहास नेविगेशन (ऊपर/नीचे तीर)',
  restoredDraft: 'संपादन में मौजूद ड्राफ्ट पुनर्स्थापित किया गया',
  noHistory: 'अभी तक कोई प्रॉम्प्ट इतिहास नहीं',
}

const id: Record<InputHistoryKey, string> = {
  ariaLabel: 'Navigasi riwayat prompt (panah atas/bawah)',
  restoredDraft: 'Draf yang sedang diedit dipulihkan',
  noHistory: 'Belum ada riwayat prompt',
}

const tr: Record<InputHistoryKey, string> = {
  ariaLabel: 'Komut geçmişinde gezinme (yukarı/aşağı ok)',
  restoredDraft: 'Düzenlenmekte olan taslak geri yüklendi',
  noHistory: 'Henüz komut geçmişi yok',
}

const vi: Record<InputHistoryKey, string> = {
  ariaLabel: 'Điều hướng lịch sử lệnh (mũi tên lên/xuống)',
  restoredDraft: 'Đã khôi phục bản nháp đang soạn',
  noHistory: 'Chưa có lịch sử lệnh',
}

const th: Record<InputHistoryKey, string> = {
  ariaLabel: 'นำทางประวัติคำสั่ง (ลูกศรขึ้น/ลง)',
  restoredDraft: 'กู้คืนฉบับร่างที่กำลังแก้ไขแล้ว',
  noHistory: 'ยังไม่มีประวัติคำสั่ง',
}

const ru: Record<InputHistoryKey, string> = {
  ariaLabel: 'Навигация по истории запросов (стрелки вверх/вниз)',
  restoredDraft: 'Текущий черновик восстановлен',
  noHistory: 'Истории запросов пока нет',
}

const it: Record<InputHistoryKey, string> = {
  ariaLabel: 'Navigazione cronologia prompt (freccia su/giù)',
  restoredDraft: 'Bozza in corso ripristinata',
  noHistory: 'Nessuna cronologia prompt finora',
}

const nl: Record<InputHistoryKey, string> = {
  ariaLabel: 'Navigatie door promptgeschiedenis (pijl omhoog/omlaag)',
  restoredDraft: 'Lopende concept hersteld',
  noHistory: 'Nog geen promptgeschiedenis',
}

const sv: Record<InputHistoryKey, string> = {
  ariaLabel: 'Navigera i prompthistorik (pil upp/ner)',
  restoredDraft: 'Utkast under arbete återställt',
  noHistory: 'Ingen prompthistorik ännu',
}

const pl: Record<InputHistoryKey, string> = {
  ariaLabel: 'Nawigacja po historii promptów (strzałka w górę/w dół)',
  restoredDraft: 'Przywrócono edytowany szkic',
  noHistory: 'Brak jeszcze historii promptów',
}

const zhHK: Record<InputHistoryKey, string> = {
  ariaLabel: '提示詞歷史導覽（上/下方向鍵）',
  restoredDraft: '已還原正在編輯的草稿',
  noHistory: '暫無提示詞歷史',
}

const zhTW: Record<InputHistoryKey, string> = {
  ariaLabel: '提示詞歷史導覽（上/下方向鍵）',
  restoredDraft: '已還原正在編輯的草稿',
  noHistory: '暫無提示詞歷史',
}

const zhMO: Record<InputHistoryKey, string> = {
  ariaLabel: '提示詞歷史導覽（上/下方向鍵）',
  restoredDraft: '已還原正在編輯的草稿',
  noHistory: '暫無提示詞歷史',
}

/**
 * All override dictionaries, keyed by language id, covering the full key
 * set. Registered with better-locale under the plugin namespace.
 */
export const dicts: Record<string, Record<InputHistoryKey, string>> = {
  ja, de, fr, pt, ko, ar, hi, id, tr, vi, th, ru, it, nl, sv, pl,
  'zh-HK': zhHK, 'zh-TW': zhTW, 'zh-MO': zhMO,
}