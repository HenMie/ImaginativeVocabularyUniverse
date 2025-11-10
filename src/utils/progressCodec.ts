import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string'
import type { PlayerProgress } from '../types/progress'

const ENCODING_PREFIX = 'IVU::v1::'

export const encodeProgressPayload = (progress: PlayerProgress): string => {
  const json = JSON.stringify(progress)
  const compressed = compressToEncodedURIComponent(json)
  return `${ENCODING_PREFIX}${compressed}`
}

export const decodeProgressPayload = (input: string): PlayerProgress => {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('内容为空')
  }

  const decodeWithPrefix = (payload: string): PlayerProgress => {
    const decompressed = decompressFromEncodedURIComponent(payload)
    if (!decompressed) {
      throw new Error('解压失败')
    }
    return JSON.parse(decompressed) as PlayerProgress
  }

  if (trimmed.startsWith(ENCODING_PREFIX)) {
    const payload = trimmed.slice(ENCODING_PREFIX.length)
    return decodeWithPrefix(payload)
  }

  try {
    return decodeWithPrefix(trimmed)
  } catch {
    return JSON.parse(trimmed) as PlayerProgress
  }
}

export const isEncodedProgressPayload = (input: string): boolean => {
  return input.trim().startsWith(ENCODING_PREFIX)
}


