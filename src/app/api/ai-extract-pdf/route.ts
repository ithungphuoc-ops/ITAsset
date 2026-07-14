import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireWriteAccess } from '@/lib/session'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const PROMPT_TEMPLATE = `Đọc nội dung báo giá/hóa đơn thiết bị IT và trích xuất thông tin.

Trả về JSON thuần (KHÔNG markdown):
{
  "nha_cung_cap": { "ten": "", "dia_chi": "", "ma_so_thue": "", "dien_thoai": "" },
  "thong_tin_mua": { "so_bao_gia": "", "ngay_bao_gia": "", "nguoi_mua": "", "don_vi_mua": "" },
  "thiet_bi": [
    {
      "ten_thiet_bi": "", "hang": "", "model": "", "so_luong": 1, "don_gia": 0,
      "loai_thiet_bi": "laptop|monitor|pc|printer|networking|component|ups|peripheral|other",
      "cpu": "", "ram": "", "o_cung": "", "man_hinh": "", "he_dieu_hanh": "",
      "kich_thuoc_man_hinh": "", "do_phan_giai": ""
    }
  ],
  "tong_tien": 0, "vat": 0, "tong_cong": 0
}

Lưu ý:
- loai_thiet_bi: tự phân loại theo tên/model
- Trích xuất CPU/RAM/SSD từ mô tả nếu có
- Số tiền là số nguyên VNĐ
- Chỉ trả JSON, không giải thích`

// Đánh giá chất lượng text
function assessTextQuality(text: string): boolean {
  const t = text.trim()
  if (t.length < 80) return false
  // Tỉ lệ ký tự lạ > 15% → ảnh OCR sai
  const weird = (t.match(/[^\x00-\x7FÀ-ỹĂăÂâÊêÔôƠơƯưĐđ0-9\s.,\-:/()+%"']/g) || []).length
  if (weird / t.length > 0.15) return false
  // Phải có số và từ khóa liên quan
  const hasNumbers = /\d{3,}/.test(t)
  const hasKeywords = /(laptop|máy|màn hình|monitor|cpu|ram|ssd|hdd|printer|switch|router|keyboard|mouse|chuột|bàn phím|thiết bị|công ty|báo giá|hóa đơn)/i.test(t)
  return hasNumbers || hasKeywords
}

// Extract text từ PDF
async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParse = ((await import('pdf-parse')) as any).default ?? (await import('pdf-parse'))
    const result = await pdfParse(Buffer.from(buffer))
    return result.text || ''
  } catch {
    return ''
  }
}

// OCR ảnh bằng Tesseract (miễn phí)
async function ocrWithTesseract(buffer: ArrayBuffer, mimeType: string): Promise<string> {
  try {
    const Tesseract = await import('tesseract.js')
    const imageData = `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`

    const result = await Tesseract.recognize(imageData, 'vie+eng', {
      logger: () => {}, // tắt log
    })
    return result.data.text || ''
  } catch {
    return ''
  }
}

// Gửi text lên Claude để parse structured data (rẻ)
async function parseWithClaudeText(text: string) {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `${PROMPT_TEMPLATE}\n\n---NỘI DUNG---\n${text.slice(0, 12000)}`,
    }],
  })
  return message.content[0].type === 'text' ? message.content[0].text : ''
}

// Gửi file lên Claude Vision (OCR + parse, đắt hơn)
async function parseWithClaudeVision(buffer: ArrayBuffer, mimeType: string) {
  const base64 = Buffer.from(buffer).toString('base64')
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          source: { type: 'base64', media_type: mimeType as any, data: base64 },
        },
        { type: 'text', text: PROMPT_TEMPLATE },
      ],
    }],
  })
  return message.content[0].type === 'text' ? message.content[0].text : ''
}

export async function POST(req: NextRequest) {
  try {
    await requireWriteAccess()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const mimeType = file.type || 'application/pdf'
    const isPdf = mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isImage = mimeType.startsWith('image/')

    let extractedText = ''
    let mode = 'claude_vision' // fallback

    // ── Bước 1: Thử extract text miễn phí ──
    if (isPdf) {
      extractedText = await extractPdfText(buffer)
      if (assessTextQuality(extractedText)) {
        mode = 'pdf_text'
        console.log('[OCR] PDF text rõ → dùng text mode (miễn phí)')
      } else {
        // PDF scan → thử Tesseract trên từng trang không dễ, dùng Claude Vision
        console.log('[OCR] PDF scan/mờ → Claude Vision')
        mode = 'claude_vision'
      }
    } else if (isImage) {
      // Thử Tesseract trước (miễn phí)
      console.log('[OCR] Ảnh → thử Tesseract miễn phí...')
      extractedText = await ocrWithTesseract(buffer, mimeType)
      if (assessTextQuality(extractedText)) {
        mode = 'tesseract'
        console.log('[OCR] Tesseract đọc được → dùng text mode (miễn phí)')
      } else {
        mode = 'claude_vision'
        console.log('[OCR] Tesseract kém → fallback Claude Vision')
      }
    }

    // ── Bước 2: Parse ra structured data ──
    let responseText = ''
    if (mode === 'pdf_text' || mode === 'tesseract') {
      responseText = await parseWithClaudeText(extractedText)
    } else {
      responseText = await parseWithClaudeVision(buffer, mimeType)
    }

    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const data = JSON.parse(cleaned)

    return NextResponse.json({ success: true, data, mode })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Không thể đọc file' }, { status: 500 })
  }
}
