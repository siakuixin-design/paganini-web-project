# paganini-web-project

Paganini Interactive Music Website — **PAGANINI · THE DEVIL'S VIOLINIST**

基于原有作品逐步升级的古典音乐剧场网站。保留 15 个原始 HTML 页面、所有原始图片／音乐、历史文字、个人感想、来源链接、唱片播放器、浮动目录及入口卡片。

## 本地运行

**Windows 推荐：完整解压后，在项目根目录双击 `START-WEBSITE.bat`。它会使用已安装的 Python 3 启动本地服务器，并自动打开浏览器；使用网站时保留命令窗口。请不要直接双击 `index.html`，那样浏览器会阻止三维模块和谱面载入。** 启动器自动选择空闲端口，地址以自动打开的浏览器为准。

需要 Python 3（网站运行无需 npm、数据库、API 密钥或打包工具；启动器不会自动安装软件）。也可在项目根目录手动执行：

```sh
python3 tools/serve.py --port 8000
```

在电脑浏览器打开 `http://127.0.0.1:8000/index.html`。停止服务按 Ctrl+C。此服务器支持音频 Range 请求，确保长录音可拖动寻位；不建议用缺少 Range 支持的普通静态服务器替代。使用 Chrome/Chromium/Edge；3D 需要 WebGL，不能使用时自动保留图文／物品按钮与演奏备用界面。请通过 HTTP 服务打开，以便加载本地 ES 模块、音频和 JSON 谱面。Three.js 已包含在本地，运行时不需要 CDN。

建议桌面宽度至少 1024px；窄屏使用纵向布局。首次进入封页可选择开启音乐或无声进入，SKIP INTRO 可随时跳过。同一标签页会话返回不强制重播。右上角保留静音和减少动态效果；所有有声播放需要用户操作。

## 操作与内容

- **人生体验**：点击三维场景物品或下方同名按钮，镜头移动并显示叙述；可以跳过镜头。点击「自由探索」后可拖动画面环顾，画面获得焦点时使用 W/A/S/D 或方向键移动，滚轮靠近／远离；触屏也可使用方向按钮。点击「返回剧情视角」或 Esc 复位。Tab 离开画面后不接管移动按键。练习室点击小提琴后进入音乐挑战，通过后返回房间，继续下方完整剧情。
- **音乐挑战**：默认 Medium，按 J/K/L 或屏幕琴弦。PERFECT/GREAT/GOOD/MISS = 100/80/50/0 分；通关线自动计算为本谱音符数 × 100 × 80%。完整播放结束后结算。暂停/继续共用音频时钟；未通关可重试。人生练习及少年舞台通过后才解锁下一阶段。浏览器本地储存记录新版通关状态。
- **乐器**：曼陀林、小提琴、吉他保留自由演奏；点击「启用演奏」，使用屏幕琴键或对应电脑键盘；松键收音，Esc 停止。三维琴弦与实际发声反馈联动。吉他挑战的 J/K/L 分别用真实 C4 采样移调为 E3/A3/D4，不使用保音高的媒体 playbackRate。小提琴／吉他挑战分别放在对应选项；切换会停止上一个挑战。可上传以 C4、A4 等音名命名的个人采样。
- **音乐作品**：保留 12 首可播放录音，包括 Cantabile、第一协奏曲终乐章、Moses Fantasy、Le streghe。每首的唱片、拖动进度、介绍和聆听注记都保留。播放后显示真实录音波形／频谱；一次只播放一首。
- **文字生平**：八章可点击时间轴和滚动同步场景；原有完整文字保留。
- **转场**：传记翻书、人生幕布、作曲风格乐谱、作品唱片、乐器旋转、遗产肖像粒子由同一个模块管理；减少动态模式直接导航。

## 文件夹结构

```text
index.html                    封页与原始入口
life/                         序幕、六个人生阶段及完整文字生平
music/                        作曲风格、作品聆听
instrument/                   三种乐器与对应挑战
effects/  beihou/              后世影响、历史背景
reflection.sumber.html        原个人感想与资料来源
assets/
  audio/                      全部原音频；game/*.json 可校正的简化谱面
  images/  fonts/  video/      原图片、本地字体、未提供视频的原说明
  js/theatre-shell.js         共用转场、会话开场、剧情解锁
  js/rhythm-mini.js           Web Audio 游戏与计分
  js/three-scenes-shared.js   Three.js 场景、程序化模型、镜头及资源管理
  js/theatre-3d.js            人生三维场景、物品拾取和剧情
  js/instrument-3d.js         三种可互动乐器模型
  js/works-score.js           实时音频分析与已核验时间谱面接口
  js/story-scroll.js          滚动传记与时间轴
  css/                        原样式及模块样式
  data/score-manifest.json    作品谱面登记（当前尚无准确谱面）
  vendor/                     固定版本 Three.js 与 MIT 许可
tests/                        单元测试和真实 Chromium 回归脚本
tools/                        支持 Range 的开发服务器、录音起音分析工具
docs/                         升级计划、素材／谱面说明、实际测试报告
```

## 验证

计分与边界单元测试需要 Node.js：

```sh
node tests/rhythm-core.test.cjs
```

浏览器测试使用 Python Playwright 和已安装的 Chromium。先启动上述 HTTP 服务器，然后运行（默认 Chromium 路径 `/usr/bin/chromium`，可依系统修改）：

```sh
python3 tests/browser-smoke.py
python3 tests/rhythm-browser.py
python3 tests/rhythm-browser.py --miss --output /tmp/paganini-validation/rhythm-miss.json
python3 tests/listening-story-browser.py
python3 tests/theatre-browser.py
python3 tests/guitar-pitch-browser.py
python3 tests/header-controls-browser.py
python3 tests/server-range-test.py
python3 tests/mobile-browser.py
python3 tests/rhythm-loading-browser.py
python3 tests/exploration-browser.py
```

测试记录见 [实际升级验证](docs/UPGRADE-VALIDATION.md)。`docs/VERIFICATION.md`、`static-check.json`、`dom-check.json` 是原作品的历史记录，不等于本次测试结果。自动化不能代替扬声器／耳机试听、手动谱面对拍、历史资料复核及学校展示电脑的性能测试。

## 边界与后续素材

当前三维环境／乐器是**真正可交互的程序化 3D 原型**，不是精细扫描实物；没有高精度人物动画、历史建筑复原和录制的掌声。模型不依赖远程 GLB，可逐步替换。详见 [3D 素材说明](docs/3D-ASSETS.md)。

游戏谱面是实际录音的**简化起音编排**，不是原曲准确旋律、指法或完整乐谱。支持时间校正及 JSON 人工修改；精确音乐性还需人工试听。详见 [游戏谱面](docs/RHYTHM_CHARTS.md)。

作品尚无对应准确 MIDI／MusicXML／核验时间标记，所以作品页明确显示「动态乐谱待补充」，仅展示真实音频可视化。已实现准确数据接入及同步音高标记的接口，但不能称作已完成的原曲动态乐谱。详见 [谱面数据格式](docs/SCORE-DATA.md)。

Google 在线字体、YouTube 片段、系统中文语音受网络与系统支持影响；本地字体、全部原有音频和图文仍可使用。原项目未提供的 MP4 没有制造占位空文件。

## 原版恢复与审阅

本次修改前建立 `backup/original-48b7a14` Git 分支，并保存完整原版归档。用 `git diff backup/original-48b7a14` 审阅；不要直接重置有自己修改的工作目录。开发计划见 [UPGRADE-PLAN.md](docs/UPGRADE-PLAN.md)。
