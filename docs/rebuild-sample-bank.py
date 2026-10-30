"""将实际存在的乐器采样内嵌，供直接双击 HTML 时使用。Python 3，无额外依赖。"""
from pathlib import Path
import base64, json, re
root=Path(__file__).resolve().parents[1]
bank={}
for instrument in ['mandolin','violin','guitar']:
    bank[instrument]=[]
    for file in sorted((root/'assets/audio/samples'/instrument).iterdir()):
        match=re.fullmatch(r'([A-G])([#b]?)([0-7])\.(wav|mp3|ogg)',file.name,re.I)
        if not match: continue
        note, accidental, octave, extension=match.groups()
        midi=(int(octave)+1)*12+{'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}[note.upper()]+(1 if accidental=='#' else -1 if accidental=='b' else 0)
        sample={'midi':midi,'file':file.relative_to(root).as_posix(),'data':'data:'+{'wav':'audio/wav','mp3':'audio/mpeg','ogg':'audio/ogg'}[extension.lower()]+';base64,'+base64.b64encode(file.read_bytes()).decode('ascii')}
        if instrument=='violin':sample.update(loopStart=.65,loopEnd=1.8)
        bank[instrument].append(sample)
        print(instrument,file.name)
(root/'assets/js/sample-bank.js').write_text('/* 已附真实采样的内嵌副本。授权见 docs/ASSETS.md。 */\nwindow.PAGANINI_SAMPLE_BANK = '+json.dumps(bank,separators=(',',':'))+';\n',encoding='utf-8')
print('sample-bank.js 已更新。')
