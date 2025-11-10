export interface GroupColorPreset {
  id: string
  background: string
  border: string
  text: string
  accent: string
  rowBackground: string
  badgeBackground: string
  badgeText: string
}

export const GROUP_COLOR_PRESETS: GroupColorPreset[] = [
  {
    id: 'mint',
    background: '#E6F6F2',
    border: '#A0E8D0',
    text: '#146356',
    accent: '#0F9D58',
    rowBackground: '#CCF0E4',
    badgeBackground: '#0F9D58',
    badgeText: '#FFFFFF',
  },
  {
    id: 'sunset',
    background: '#FFF3E6',
    border: '#F7C59F',
    text: '#8C3B00',
    accent: '#EA580C',
    rowBackground: '#FFE0C2',
    badgeBackground: '#EA580C',
    badgeText: '#FFFFFF',
  },
  {
    id: 'lilac',
    background: '#F3E8FF',
    border: '#D8B4FE',
    text: '#5B21B6',
    accent: '#7C3AED',
    rowBackground: '#E9D5FF',
    badgeBackground: '#7C3AED',
    badgeText: '#FFFFFF',
  },
  {
    id: 'rose',
    background: '#FFE5EC',
    border: '#FFB8C6',
    text: '#9D174D',
    accent: '#DB2777',
    rowBackground: '#FFD6E2',
    badgeBackground: '#DB2777',
    badgeText: '#FFFFFF',
  },
  {
    id: 'sky',
    background: '#E0F2FE',
    border: '#9ED0FB',
    text: '#0C4A6E',
    accent: '#0284C7',
    rowBackground: '#C7E5FB',
    badgeBackground: '#0284C7',
    badgeText: '#FFFFFF',
  },
  {
    id: 'crimson',
    background: '#FEE2E2',
    border: '#FCA5A5',
    text: '#991B1B',
    accent: '#E11D48',
    rowBackground: '#FECACA',
    badgeBackground: '#E11D48',
    badgeText: '#FFFFFF',
  },
  {
    id: 'teal',
    background: '#E6F7F5',
    border: '#99D6CC',
    text: '#134E4A',
    accent: '#0D9488',
    rowBackground: '#CCEDE8',
    badgeBackground: '#0D9488',
    badgeText: '#FFFFFF',
  },
  {
    id: 'amber',
    background: '#FEF3C7',
    border: '#FCD34D',
    text: '#78350F',
    accent: '#F59E0B',
    rowBackground: '#FDE68A',
    badgeBackground: '#F59E0B',
    badgeText: '#FFFFFF',
  },
  {
    id: 'indigo',
    background: '#E0E7FF',
    border: '#A5B4FC',
    text: '#312E81',
    accent: '#4F46E5',
    rowBackground: '#C7D2FE',
    badgeBackground: '#4F46E5',
    badgeText: '#FFFFFF',
  },
  {
    id: 'emerald',
    background: '#D1FAE5',
    border: '#6EE7B7',
    text: '#064E3B',
    accent: '#10B981',
    rowBackground: '#A7F3D0',
    badgeBackground: '#10B981',
    badgeText: '#FFFFFF',
  },
]

export const getGroupColorPreset = (id: string): GroupColorPreset | undefined =>
  GROUP_COLOR_PRESETS.find((preset) => preset.id === id)

export const getGroupColorByIndex = (index: number): GroupColorPreset =>
  GROUP_COLOR_PRESETS[index % GROUP_COLOR_PRESETS.length]

