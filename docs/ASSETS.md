# 素材状态、授权及替换方法

## 已经提供

| 类型 | 实际位置 | 说明 |
|---|---|---|
| 13 个网页 | 根目录及 `life/`、`beihou/`、`music/`、`effects/`、`instrument/` | 都是实际完整 HTML，原根目录的空白 instrument.html 已由新页面代替 |
| 共用样式与程式 | `assets/css/`、`assets/js/` | 不依赖 CDN JavaScript，不需要安装框架 |
| 原包图片 | `assets/images/`、`assets/images/life/`、`assets/images/legacy/` | 原包 31 张图片均保留；文件名中的“ (2)”已去掉，引用同步更新 |
| 原创 SVG | `assets/images/hero-devil.svg`、`assets/images/empty-room.svg`，以及页面内联 SVG | 恶魔传说背景、空房间、人物局部及乐器示意；不冒充照片或真人视频 |
| 8 段原包音乐 | `assets/audio/works/` | 正常 MP3，完整曲长保留，统一到 128kbps；无强制自动播放 |
| 真实曼陀林采样 | `assets/audio/samples/mandolin/C4.wav`、`C5.wav` | 单声道 44.1kHz / 16bit WAV；真实录音切分、校音、去直流与淡入淡出 |
| 真实小提琴采样 | `assets/audio/samples/violin/C4.mp3`、`A4.mp3` | 原采样 MP3，保持原文件；运行时进行移调与稳定区循环 |
| 真实木吉他采样 | `assets/audio/samples/guitar/C4.mp3` | 原采样 MP3，保持原文件；运行时移调并保持拨弦衰减 |
| 离线采样副本 | `assets/js/sample-bank.js` | 与上述采样逐字节一致的 data URI；不用本地 fetch，因此直接打开 HTML 也能解码 |
| 本地书法字体 | `assets/fonts/ZhiMangXing-Regular.ttf`、`OFL.txt` | 从 Google Fonts 官方仓库取得，SIL Open Font License 1.1；HTML 同时使用用户指定的正确 Google Fonts 链接 |
| 合成旁白 | 电脑浏览器的 Web Speech API | 不是另附的真人录音文件；电脑需要可用的中文语音 |

原图片与音乐的旧路径、新路径分别在 `asset-renames.json` 和 `audio-renames.json`，所有原素材实际位置已检查。

## 真实采样来源及署名

### 曼陀林

- 作者：**Taku19810729**。
- 原标题：**mandolin-CDEFGABC.wav**。
- 来源：https://freesound.org/people/Taku19810729/sounds/255837/
- 原文件说明：曼陀林 CDEFGABC 音阶，2014-11-26。
- 使用的是可公开访问的高质量 MP3 预听副本，保留在本项目的派生采样中。
- 授权：**CC0 1.0**，https://creativecommons.org/publicdomain/zero/1.0/ 。
- 处理：切分约 0.98–1.20 秒与 4.12–4.64 秒的 C 音，校正录音略偏高的音高、去直流、响度归一及淡入淡出，输出 C4.wav / C5.wav。详情在 `mandolin-processing.json`。
- 这是实际乐器录音，不是用电子合成冒充曼陀林。

### 小提琴和木吉他

- 采样集：**tonejs-instruments**，整理者 **Nicholaus P. Brosowsky / nbrosowsky** 及原采样作者。
- 项目：https://github.com/nbrosowsky/tonejs-instruments
- 授权页面：https://github.com/nbrosowsky/tonejs-instruments/blob/master/LICENSE.md
- 来源清单：https://github.com/nbrosowsky/tonejs-instruments/blob/master/sample-source-info.txt
- 采样授权：**CC BY 3.0**，https://creativecommons.org/licenses/by/3.0/ 。采样集代码的 MIT 授权与采样的 CC BY 3.0 不要混淆；本网站不依赖 Tone.js 的代码。
- 根据原来源清单，小提琴来自 VSCO2 / Versilian Studios，木吉他来自 University of Iowa Musical Instrument Samples。
- 取用原文件：`samples/violin/C4.mp3`、`samples/violin/A4.mp3`、`samples/guitar-acoustic/C4.mp3`。
- 这里的 MP3 文件没有改动。网页演奏时会通过播放速率移调；小提琴使用 0.65–1.8 秒的稳定区作短循环并在松键时淡出。这是处理后的体验效果，不能理解为原录音者演奏了所有音高。
- 保留本说明和乐器页上的署名与许可证链接。

### 字体

- Google Fonts 官方库：https://github.com/google/fonts/tree/main/ofl/zhimangxing
- 本地字体文件附在 `assets/fonts/`，完整许可证在 `OFL.txt`。
- 所有主要标题使用：`"Zhi Mang Xing", "KaiTi", "STKaiti", "DFKai-SB", cursive`。
- 不宣称原 ZIP 已经包含该字体；它是此次新增的素材。

### 原 ZIP 的音乐、图片和电影

原包音乐重新编码但没有裁掉乐曲内容。文件名含 Europeana / Free-scores 来源线索；吉他文件部分带有 `Paganini_gp` 标签，可能是演示音源。没有将这些文件统称为真人录音或公版。

《钟》的原文件名注明 Romanian Radio Broadcasting Company 与 CC BY-SA，但没有足够的录音者、许可证版本和原条目资料。其他原音乐和原图片同样不能仅靠文件名认定开放授权。该项目保留为你提供材料的改版；若将来公开发布，应按原条目补全实际演奏者、来源和适用的授权说明，不要删除已有署名。

原电影只保留 YouTube 嵌入链接，不下载或假装已经提供电影文件。用户点击才建立 iframe，且须再点击播放器播放；静音或离开页面会移除 iframe，阻止继续发声。

## 尚待准备：没有伪装文件

| 尚未提供 | 预留文件路径 | 对应网页 | 当前可运行的替代方案 |
|---|---|---|---|
| 《魔鬼的笑声》完整录音 | `assets/audio/works/caprice-13.mp3` | `music/works.html` | 保留正确的第 13 首介绍、明确禁用的录音按钮及外部曲目页；其他 8 段作品音频正常可用 |
| 开场真人动作短片 | `assets/video/prologue-performance.mp4` | `life/begining.html` | 原创分层人物示意、灯光与乐谱，以及原在线电影片段按钮 |
| 练琴真人动作短片 | `assets/video/practice-bowing.mp4` | `life/scene03.html` / scene03.03 | 同一底图、分层琴弓和手指、天色叠层与谱页翻转 |
| 巡演真人动作短片 | `assets/video/european-performance.mp4` | `life/scene05.html` / scene05.03 | 原舞台底图、分层人物动作、光线与城市文字 |

没有人声录音文件，也没有把系统合成声音称为帕格尼尼本人声音。没有生成 MP4 短视频；新增的是能实际移动局部的 SVG 示意，而不是图片逐张切换。

## 人物视频嵌入：完整可用代码

以下结构已经放在实际页面里。未准备好文件时保持 `data-available="false"`，脚本不会设置 src 或向不存在的视频发起请求。

`life/scene03.html` 的实际代码：

```html
<video
  id="scene03-03-video"
  data-local-video
  data-available="false"
  data-video-src="../assets/video/practice-bowing.mp4"
  poster="../assets/images/life/scene03.03.jpg"
  preload="none"
  controls
  hidden>
</video>
<button
  type="button"
  class="btn performance-button"
  data-video-target="scene03-03-video"
  hidden>▷ 播放人物短片</button>
```

准备好文件后只改为：

```html
data-available="true"
```

`life/scene05.html` 使用 `id="scene05-03-video"`、`data-video-target="scene05-03-video"`，路径 `../assets/video/european-performance.mp4`，备用图 `../assets/images/life/scene05.03.png`。

`life/begining.html` 使用 `id="prologue-video"`、`data-video-target="prologue-video"`，路径 `../assets/video/prologue-performance.mp4`，备用图同为 `../assets/images/life/scene05.03.png`。若启用本地开场视频，会优先显示本地按钮；文件失败时恢复静态画面与在线片段入口。

视频按钮、原生播放控制、静音和旁白使用同一个声音管理逻辑。离页暂停所有本地视频；文件错误时恢复底图。建议 MP4/H.264，16:9，720p 或 1080p，6–12 秒。

## 补充第 13 首录音

1. 准备可用于此项目的正确第 13 首录音，命名 `caprice-13.mp3`。
2. 放入 `assets/audio/works/`。
3. 在 `music/works.html` 找到《魔鬼的笑声》对应 `<article>`，把 `data-pending-src` 改成 `data-src`；路径保持 `../assets/audio/works/caprice-13.mp3`。
4. 删除该 article 的 `unavailable` 类，以及唱片按钮、进度条上的 `disabled`。
5. 把按钮文字「录音待准备」改成「▷ 点击聆听」，更新本曲的提示文字和正确署名。

现有通用播放器会负责播放、暂停、进度、唱片旋转和单曲互斥。不要拿已有 `caprices-excerpt.mp3` 或 `i-palpiti.mp3` 改名来冒充第 13 首。

## 添加自己的真实乐器采样

最简单：在乐器页展开「使用自己的乐器采样」，选择 WAV / MP3 / OGG 文件。文件名使用 **C4.wav、A4.mp3、C5.wav** 这样的音名。先选好乐器，再载入。每个已载入的音会按最近音高移调；文件不会上传到网络。

长期加入项目时，建议文件夹：

- `assets/audio/samples/mandolin/C4.wav`、`G4.wav`、`C5.wav`。
- `assets/audio/samples/violin/C4.wav`、`A4.wav`、`C5.wav`。
- `assets/audio/samples/guitar/C3.wav`、`C4.wav`、`C5.wav`。

只有实际准备好这些文件时才加入。不要放空文件。替换文件之后，应同步重新生成内嵌副本 `sample-bank.js`；否则页面仍会播放已经附上的旧采样。项目附有 `docs/rebuild-sample-bank.py`，用 Python 3 执行即可更新。不必改动演奏控制器。

## JavaScript 直接生成的内容

| 内容 | 是否需要音频文件 | 说明 |
|---|---|---|
| 音高移调、包络淡出、声音限制 | 不需要额外文件 | 由 Web Audio 管理真实采样 |
| 备用小提琴 | 不需要 | 振荡器、低通滤波与轻微揉弦；明显是合成模型 |
| 备用曼陀林/吉他 | 不需要 | 拨弦物理模型；没有真实乐器的完整共鸣细节 |
| 合成旁白 | 不需要自己的录音文件 | 依赖系统语音引擎与中文声音 |
| 点击音符、鼠标拖尾、幕布/翻谱/呼吸/手指 | 不需要音频文件 | CSS 与 JavaScript 视觉效果；不会偷偷自动播放点击音效 |

本项目不是高级采样器，没有多力度层、完整颤音技巧、弓压控制或真正的连续滑音。它提供的是稳定、可停止、可连续演奏的键盘体验。
