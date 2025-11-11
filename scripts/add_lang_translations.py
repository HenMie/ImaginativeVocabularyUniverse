import json
import time
from pathlib import Path
from googletrans import Translator

BASE = Path('public/levels')
translator = Translator(service_urls=['translate.google.com'], raise_exception=True)
setattr(translator, 'raise_Exception', True)

def normalize_language_codes(codes):
    preferred_order = ['ko', 'zh', 'en', 'ja']
    # preserve order but ensure all preferred appear once if present
    seen = []
    for code in codes:
        if code not in seen:
            seen.append(code)
    seen.sort(key=lambda c: preferred_order.index(c) if c in preferred_order else len(preferred_order) + ord(c[0]))
    return seen


def translate(text: str, dest: str) -> str:
    last_error = None
    for attempt in range(5):
        try:
            result = translator.translate(text, src='zh-cn', dest=dest)
            return result.text.strip()
        except Exception as exc:
            last_error = exc
            time.sleep(1.0 + attempt * 0.5)
    raise last_error if last_error else RuntimeError('translation failed')


def main():
    files = sorted(BASE.glob('level-*.json'))
    if not files:
        raise SystemExit('No level files found')
    for path in files:
        with path.open('r', encoding='utf-8') as f:
            data = json.load(f)
        modified = False
        definition_langs = set()
        for group in data.get('groups', []):
            for tile in group.get('tiles', []):
                translations = tile.setdefault('translations', {})
                zh = translations.get('zh')
                if not zh:
                    continue
                if 'en' not in translations:
                    translations['en'] = translate(zh, 'en')
                    modified = True
                if 'ja' not in translations:
                    translations['ja'] = translate(zh, 'ja')
                    modified = True
                definition_langs.update(translations.keys())

        normalized_codes = normalize_language_codes(sorted(definition_langs))

        profile = data.setdefault('languageProfile', {})
        game_config = profile.setdefault('game', {})
        if 'default' not in game_config:
            first_tile_lang = None
            for group in data.get('groups', []):
                if group.get('tiles'):
                    first_tile_lang = group['tiles'][0].get('languageCode')
                    if first_tile_lang:
                        break
            game_config['default'] = first_tile_lang or 'ko'
        if 'options' not in game_config or not game_config['options']:
            game_config['options'] = [game_config['default']]

        definition_config = profile.setdefault('definitions', {})
        previous_options = definition_config.get('options', [])
        if normalized_codes and normalized_codes != previous_options:
            definition_config['options'] = normalized_codes
            modified = True
        defaults = definition_config.get('defaults')
        if not defaults:
            defaults = normalized_codes[:2] if normalized_codes else ['zh']
            definition_config['defaults'] = defaults
            modified = True
        definition_config['min'] = definition_config.get('min', 1)
        definition_config['max'] = definition_config.get('max', 3)

        if modified:
            with path.open('w', encoding='utf-8', newline='\n') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write('\n')
            print(f'Updated {path.name}')
        else:
            print(f'Skipped {path.name} (no changes)')

if __name__ == '__main__':
    main()
