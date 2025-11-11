import json
import time
from pathlib import Path

from googletrans import Translator

BASE = Path("public/levels")
TARGET_LEVELS = [f"level-{str(i).zfill(3)}.json" for i in range(2, 21)]
LANGS = ["ko", "zh", "en", "ja"]


translator = Translator(service_urls=["translate.google.com"], raise_exception=True)


def translate(text: str, dest: str) -> str:
    last_error = None
    for attempt in range(5):
        try:
            return translator.translate(text, src="zh-cn", dest=dest).text.strip()
        except Exception as exc:
            last_error = exc
            time.sleep(1.0 + attempt * 0.5)
    if last_error:
        raise last_error
    raise RuntimeError("translation failed")


CATEGORY_OVERRIDES = {
    "三餐": {
        "ko": "하루 세 끼",
        "zh": "三餐",
        "en": "three daily meals",
        "ja": "一日三食",
    },
    "乐器": {
        "ko": "악기",
        "zh": "乐器",
        "en": "musical instruments",
        "ja": "楽器",
    },
    "人生阶段": {
        "ko": "인생 단계",
        "zh": "人生阶段",
        "en": "life stages",
        "ja": "人生の段階",
    },
    "人群规模": {
        "ko": "인원 규모",
        "zh": "人群规模",
        "en": "group sizes",
        "ja": "人数規模",
    },
    "以기结尾": {
        "ko": "‘기’로 끝나는 단어",
        "zh": "以기结尾",
        "en": "words ending with ‘기’",
        "ja": "「기」で終わる語",
    },
    "保存方式": {
        "ko": "보관 방법",
        "zh": "保存方式",
        "en": "storage methods",
        "ja": "保存方法",
    },
    "信息传播": {
        "ko": "정보 전파",
        "zh": "信息传播",
        "en": "information dissemination",
        "ja": "情報伝播",
    },
    "健身热潮": {
        "ko": "피트니스 열풍",
        "zh": "健身热潮",
        "en": "fitness boom",
        "ja": "フィットネスブーム",
    },
    "光源": {
        "ko": "광원",
        "zh": "光源",
        "en": "light sources",
        "ja": "光源",
    },
    "公共交通": {
        "ko": "대중교통",
        "zh": "公共交通",
        "en": "public transportation",
        "ja": "公共交通機関",
    },
    "公民参与": {
        "ko": "시민 참여",
        "zh": "公民参与",
        "en": "civic engagement",
        "ja": "市民参加",
    },
    "关系状态": {
        "ko": "관계 상태",
        "zh": "关系状态",
        "en": "relationship status",
        "ja": "関係ステータス",
    },
    "兴趣爱好": {
        "ko": "취미와 관심사",
        "zh": "兴趣爱好",
        "en": "hobbies and interests",
        "ja": "趣味と関心",
    },
    "决策过程": {
        "ko": "의사 결정 과정",
        "zh": "决策过程",
        "en": "decision-making processes",
        "ja": "意思決定プロセス",
    },
    "切割工具": {
        "ko": "절단 도구",
        "zh": "切割工具",
        "en": "cutting tools",
        "ja": "切断工具",
    },
    "动物": {
        "ko": "동물",
        "zh": "动物",
        "en": "animals",
        "ja": "動物",
    },
    "协作关系": {
        "ko": "협력 관계",
        "zh": "协作关系",
        "en": "collaborative relationships",
        "ja": "協力関係",
    },
    "叙事结构": {
        "ko": "서사 구조",
        "zh": "叙事结构",
        "en": "narrative structures",
        "ja": "物語構造",
    },
    "口味": {
        "ko": "맛",
        "zh": "口味",
        "en": "flavors",
        "ja": "味",
    },
    "可延期的事物": {
        "ko": "미룰 수 있는 일",
        "zh": "可延期的事物",
        "en": "things you can postpone",
        "ja": "延期できるもの",
    },
    "可折叠": {
        "ko": "접을 수 있는 것",
        "zh": "可折叠",
        "en": "foldable items",
        "ja": "折りたためるもの",
    },
    "周期性纪念": {
        "ko": "주기적인 기념일",
        "zh": "周期性纪念",
        "en": "recurring observances",
        "ja": "周期的な記念日",
    },
    "咖啡文化": {
        "ko": "커피 문화",
        "zh": "咖啡文化",
        "en": "coffee culture",
        "ja": "コーヒーカルチャー",
    },
    "品质": {
        "ko": "기를 수 있는 가치",
        "zh": "品质",
        "en": "qualities to cultivate",
        "ja": "育てられる価値",
    },
    "商店": {
        "ko": "가게",
        "zh": "商店",
        "en": "shops",
        "ja": "店",
    },
    "圆形物": {
        "ko": "둥근 것",
        "zh": "圆形物",
        "en": "round objects",
        "ja": "丸いもの",
    },
    "城市设施": {
        "ko": "도시 시설",
        "zh": "城市设施",
        "en": "urban facilities",
        "ja": "都市施設",
    },
    "备考": {
        "ko": "시험 대비",
        "zh": "备考",
        "en": "exam preparation",
        "ja": "試験対策",
    },
    "外卖文化": {
        "ko": "배달 문화",
        "zh": "外卖文化",
        "en": "takeout culture",
        "ja": "デリバリー文化",
    },
    "大小": {
        "ko": "크기",
        "zh": "大小",
        "en": "sizes",
        "ja": "大きさ",
    },
    "天气": {
        "ko": "날씨",
        "zh": "天气",
        "en": "weather",
        "ja": "天気",
    },
    "季节": {
        "ko": "계절",
        "zh": "季节",
        "en": "seasons",
        "ja": "季節",
    },
    "学习用品": {
        "ko": "학습용품",
        "zh": "学习用品",
        "en": "study supplies",
        "ja": "学習用品",
    },
    "学术与表达": {
        "ko": "학문과 표현",
        "zh": "学术与表达",
        "en": "academia and expression",
        "ja": "学術と表現",
    },
    "学术规范": {
        "ko": "학술 규범",
        "zh": "学术规范",
        "en": "academic conventions",
        "ja": "学術規範",
    },
    "学科": {
        "ko": "학과",
        "zh": "学科",
        "en": "academic subjects",
        "ja": "学科",
    },
    "家务动作": {
        "ko": "집안일 동작",
        "zh": "家务动作",
        "en": "household chores",
        "ja": "家事の動作",
    },
    "家庭成员": {
        "ko": "가족 구성원",
        "zh": "家庭成员",
        "en": "family members",
        "ja": "家族のメンバー",
    },
    "容器": {
        "ko": "용기",
        "zh": "容器",
        "en": "containers",
        "ja": "容器",
    },
    "宿舍生活": {
        "ko": "기숙사 생활",
        "zh": "宿舍生活",
        "en": "dorm life",
        "ja": "寮生活",
    },
    "工作生活": {
        "ko": "직장 생활",
        "zh": "工作生活",
        "en": "work life",
        "ja": "仕事生活",
    },
    "常见食物": {
        "ko": "일상 음식",
        "zh": "常见食物",
        "en": "everyday foods",
        "ja": "日常の食べ物",
    },
    "心理健康": {
        "ko": "정신 건강",
        "zh": "心理健康",
        "en": "mental health",
        "ja": "メンタルヘルス",
    },
    "心理过程": {
        "ko": "심리 과정",
        "zh": "心理过程",
        "en": "psychological processes",
        "ja": "心理過程",
    },
    "情绪": {
        "ko": "감정",
        "zh": "情绪",
        "en": "emotions",
        "ja": "感情",
    },
    "情绪动作": {
        "ko": "감정적 행동",
        "zh": "情绪动作",
        "en": "emotional actions",
        "ja": "感情表現の動作",
    },
    "成双成对": {
        "ko": "짝을 이루는 것",
        "zh": "成双成对",
        "en": "things that come in pairs",
        "ja": "対になっているもの",
    },
    "房间": {
        "ko": "방",
        "zh": "房间",
        "en": "rooms",
        "ja": "部屋",
    },
    "护肤补给": {
        "ko": "스킨케어 용품",
        "zh": "护肤补给",
        "en": "skincare essentials",
        "ja": "スキンケア用品",
    },
    "拖延行为": {
        "ko": "미루는 행동",
        "zh": "拖延行为",
        "en": "procrastination habits",
        "ja": "先延ばし行動",
    },
    "支付方式": {
        "ko": "결제 방식",
        "zh": "支付方式",
        "en": "payment methods",
        "ja": "支払い方法",
    },
    "政策工具": {
        "ko": "정책 수단",
        "zh": "政策工具",
        "en": "policy tools",
        "ja": "政策手段",
    },
    "数字": {
        "ko": "숫자",
        "zh": "数字",
        "en": "numbers",
        "ja": "数字",
    },
    "数据处理": {
        "ko": "데이터 처리",
        "zh": "数据处理",
        "en": "data processing",
        "ja": "データ処理",
    },
    "文具": {
        "ko": "문구류",
        "zh": "文具",
        "en": "stationery",
        "ja": "文房具",
    },
    "文化理解": {
        "ko": "문화 이해",
        "zh": "文化理解",
        "en": "cultural understanding",
        "ja": "文化理解",
    },
    "方向": {
        "ko": "방향",
        "zh": "方向",
        "en": "directions",
        "ja": "方向",
    },
    "日常动作": {
        "ko": "일상 행동",
        "zh": "日常动作",
        "en": "everyday actions",
        "ja": "日常の動作",
    },
    "日常地点": {
        "ko": "일상 장소",
        "zh": "日常地点",
        "en": "everyday places",
        "ja": "日常的な場所",
    },
    "时间词": {
        "ko": "시간 표현",
        "zh": "时间词",
        "en": "time words",
        "ja": "時間に関する語",
    },
    "有粘性的": {
        "ko": "끈적거리는 것",
        "zh": "有粘性的",
        "en": "sticky things",
        "ja": "粘りのあるもの",
    },
    "极简主义": {
        "ko": "미니멀리즘",
        "zh": "极简主义",
        "en": "minimalism",
        "ja": "ミニマリズム",
    },
    "校园生活": {
        "ko": "캠퍼스 생활",
        "zh": "校园生活",
        "en": "campus life",
        "ja": "キャンパスライフ",
    },
    "水果": {
        "ko": "과일",
        "zh": "水果",
        "en": "fruits",
        "ja": "果物",
    },
    "水的形态": {
        "ko": "물의 형태",
        "zh": "水的形态",
        "en": "forms of water",
        "ja": "水の形態",
    },
    "流媒体": {
        "ko": "스트리밍",
        "zh": "流媒体",
        "en": "streaming media",
        "ja": "ストリーミングメディア",
    },
    "温度感受": {
        "ko": "온도 감각",
        "zh": "温度感受",
        "en": "temperature sensations",
        "ja": "温度の感覚",
    },
    "烹饪方式": {
        "ko": "조리 방법",
        "zh": "烹饪方式",
        "en": "cooking methods",
        "ja": "調理法",
    },
    "燃料": {
        "ko": "연료",
        "zh": "燃料",
        "en": "fuels",
        "ja": "燃料",
    },
    "生长过程": {
        "ko": "성장 과정",
        "zh": "生长过程",
        "en": "growth stages",
        "ja": "成長過程",
    },
    "电子产品": {
        "ko": "전자 제품",
        "zh": "电子产品",
        "en": "electronics",
        "ja": "電子製品",
    },
    "看不见的": {
        "ko": "보이지 않는 것",
        "zh": "看不见的",
        "en": "invisible things",
        "ja": "見えないもの",
    },
    "睡眠不足": {
        "ko": "수면 부족",
        "zh": "睡眠不足",
        "en": "sleep deprivation",
        "ja": "睡眠不足",
    },
    "破碎声": {
        "ko": "부서지는 소리",
        "zh": "破碎声",
        "en": "breaking sounds",
        "ja": "割れる音",
    },
    "社交媒体": {
        "ko": "소셜 미디어",
        "zh": "社交媒体",
        "en": "social media",
        "ja": "ソーシャルメディア",
    },
    "社会价值": {
        "ko": "사회적 가치",
        "zh": "社会价值",
        "en": "social values",
        "ja": "社会的価値",
    },
    "科学测度": {
        "ko": "과학적 측정",
        "zh": "科学测度",
        "en": "scientific measures",
        "ja": "科学的測度",
    },
    "科技趋势": {
        "ko": "기술 트렌드",
        "zh": "科技趋势",
        "en": "technology trends",
        "ja": "テクノロジートレンド",
    },
    "组织形态": {
        "ko": "조직 형태",
        "zh": "组织形态",
        "en": "organizational forms",
        "ja": "組織形態",
    },
    "网络用语": {
        "ko": "인터넷 용어",
        "zh": "网络用语",
        "en": "internet slang",
        "ja": "ネット用語",
    },
    "网购行为": {
        "ko": "온라인 쇼핑 행동",
        "zh": "网购行为",
        "en": "online shopping behaviors",
        "ja": "ネット通販の行動",
    },
    "能源类型": {
        "ko": "에너지 유형",
        "zh": "能源类型",
        "en": "energy types",
        "ja": "エネルギーの種類",
    },
    "自我提升": {
        "ko": "자기 계발",
        "zh": "自我提升",
        "en": "self improvement",
        "ja": "自己啓発",
    },
    "自然": {
        "ko": "자연",
        "zh": "自然",
        "en": "nature",
        "ja": "自然",
    },
    "自然天气": {
        "ko": "자연 날씨",
        "zh": "自然天气",
        "en": "natural weather",
        "ja": "自然天気",
    },
    "自然循环": {
        "ko": "자연 순환",
        "zh": "自然循环",
        "en": "natural cycles",
        "ja": "自然の循環",
    },
    "自由职业": {
        "ko": "프리랜서",
        "zh": "自由职业",
        "en": "freelancing",
        "ja": "フリーランス",
    },
    "蔬菜": {
        "ko": "채소",
        "zh": "蔬菜",
        "en": "vegetables",
        "ja": "野菜",
    },
    "街头小吃": {
        "ko": "길거리 음식",
        "zh": "街头小吃",
        "en": "street snacks",
        "ja": "屋台の食べ物",
    },
    "衡量维度": {
        "ko": "측정 차원",
        "zh": "衡量维度",
        "en": "measurement dimensions",
        "ja": "測定の次元",
    },
    "衣物": {
        "ko": "의류",
        "zh": "衣物",
        "en": "clothing",
        "ja": "衣類",
    },
    "记录工具": {
        "ko": "기록 도구",
        "zh": "记录工具",
        "en": "recording tools",
        "ja": "記録ツール",
    },
    "证据逻辑": {
        "ko": "증거 논리",
        "zh": "证据逻辑",
        "en": "evidence logic",
        "ja": "証拠の論理",
    },
    "证明文件": {
        "ko": "증명 서류",
        "zh": "证明文件",
        "en": "proof documents",
        "ja": "証明書類",
    },
    "评价标准": {
        "ko": "평가 기준",
        "zh": "评价标准",
        "en": "evaluation criteria",
        "ja": "評価基準",
    },
    "质感": {
        "ko": "질감",
        "zh": "质感",
        "en": "textures",
        "ja": "質感",
    },
    "身体感觉": {
        "ko": "신체 감각",
        "zh": "身体感觉",
        "en": "bodily sensations",
        "ja": "身体の感覚",
    },
    "身体部位": {
        "ko": "신체 부위",
        "zh": "身体部位",
        "en": "body parts",
        "ja": "身体の部位",
    },
    "运动": {
        "ko": "운동",
        "zh": "运动",
        "en": "sports",
        "ja": "スポーツ",
    },
    "连接工具": {
        "ko": "연결 도구",
        "zh": "连接工具",
        "en": "connecting tools",
        "ja": "接続ツール",
    },
    "追剧文化": {
        "ko": "드라마 정주행 문화",
        "zh": "追剧文化",
        "en": "binge-watching culture",
        "ja": "ドラマ一気見文化",
    },
    "透明的": {
        "ko": "투명한 것",
        "zh": "透明的",
        "en": "transparent things",
        "ja": "透明なもの",
    },
    "通讯工具": {
        "ko": "통신 도구",
        "zh": "通讯工具",
        "en": "communication tools",
        "ja": "通信手段",
    },
    "速度层级": {
        "ko": "속도 단계",
        "zh": "速度层级",
        "en": "speed tiers",
        "ja": "速度レベル",
    },
    "降温方式": {
        "ko": "냉각 방법",
        "zh": "降温方式",
        "en": "cooling methods",
        "ja": "冷却方法",
    },
    "随身物品": {
        "ko": "휴대품",
        "zh": "随身物品",
        "en": "carry-on items",
        "ja": "携帯品",
    },
    "颜色": {
        "ko": "색",
        "zh": "颜色",
        "en": "colors",
        "ja": "色",
    },
    "风险管理": {
        "ko": "리스크 관리",
        "zh": "风险管理",
        "en": "risk management",
        "ja": "リスク管理",
    },
    "饮料": {
        "ko": "음료",
        "zh": "饮料",
        "en": "drinks",
        "ja": "飲み物",
    },
    "以기结尾的形容词": {
        "ko": "‘기’로 끝나는 형용사",
        "zh": "以기结尾的形容词",
        "en": "adjectives ending with ‘기’",
        "ja": "「기」で終わる形容詞",
    },
}


TILE_TEXT_OVERRIDES = {
    "the bus": "bus",
    "The bus": "bus",
    "Spicy rice cake": "spicy rice cake",
    "sugar cookies": "sweet pancake",
    "Crucian carp cake": "fish-shaped pastry",
    "Facial mask": "sheet mask",
    "Backpack": "backpack",
    "Umbrella": "umbrella",
    "Eye cream": "eye cream",
    "Essence": "serum",
    "Meeting": "meeting",
    "Agreement": "appointment",
    "Set off": "departure",
    "infancy": "childhood",
    "middle aged": "middle age",
    "elderly": "old age",
    "Habit": "habit",
    "Talent": "talent",
    "Early morning": "early morning",
}


def ensure_category_map(category: str) -> dict[str, str]:
    if category in CATEGORY_OVERRIDES:
        return CATEGORY_OVERRIDES[category]
    mapped = {"zh": category}
    mapped["en"] = translate(category, "en")
    mapped["ko"] = translate(category, "ko")
    mapped["ja"] = translate(category, "ja")
    CATEGORY_OVERRIDES[category] = mapped
    return mapped


def normalize_tile_text(text_map: dict[str, str]) -> None:
    for lang, value in list(text_map.items()):
        if lang == "en":
            text_map[lang] = TILE_TEXT_OVERRIDES.get(value, value).strip()
        else:
            text_map[lang] = value.strip()


def upgrade_level(path: Path) -> bool:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    updated = {
        "id": data["id"],
        "difficulty": data["difficulty"],
        "version": 2,
        "language": LANGS[:],
    }

    tutorial_steps = data.get("tutorialSteps")
    if tutorial_steps:
        steps = []
        for idx, step in enumerate(tutorial_steps):
            if isinstance(step, dict):
                step_map = {lang: step.get(lang, "").strip() for lang in LANGS if step.get(lang)}
            else:
                step_map = {"zh": step.strip()}
                step_map["en"] = translate(step_map["zh"], "en")
                step_map["ko"] = translate(step_map["zh"], "ko")
                step_map["ja"] = translate(step_map["zh"], "ja")
            steps.append(step_map)
        updated["tutorialSteps"] = steps
    else:
        updated["tutorialSteps"] = []

    groups = []
    for group in data.get("groups", []):
        category = group.get("category")
        if isinstance(category, dict):
            zh_label = category.get("zh")
            if zh_label and zh_label in CATEGORY_OVERRIDES:
                category_map = CATEGORY_OVERRIDES[zh_label]
            else:
                category_map = category
        else:
            category_map = ensure_category_map(category)
        tiles = []
        for tile in group.get("tiles", []):
            text_field = tile.get("text")
            if isinstance(text_field, dict):
                text_map = {lang: text_field.get(lang, "").strip() for lang in LANGS if text_field.get(lang)}
            else:
                text_map = {}
                base_text = text_field.strip() if isinstance(text_field, str) else ""
                language_code = tile.get("languageCode")
                if base_text and language_code:
                    text_map[language_code] = base_text
                for lang, value in tile.get("translations", {}).items():
                    if value:
                        text_map[lang] = value.strip()
            normalize_tile_text(text_map)
            for lang in LANGS:
                if lang not in text_map:
                    raise ValueError(f"Missing {lang} translation in {path.name}:{group['id']}:{tile['id']}")
            tiles.append({"id": tile["id"], "text": text_map})
        groups.append(
            {
                "id": group["id"],
                "category": category_map,
                "colorPreset": group["colorPreset"],
                "tiles": tiles,
            }
        )
    updated["groups"] = groups

    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(updated, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return True


def main() -> None:
    for name in TARGET_LEVELS:
        path = BASE / name
        if not path.exists():
            continue
        upgrade_level(path)


if __name__ == "__main__":
    main()

