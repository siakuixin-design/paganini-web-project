# 人物短视频存放位置

当前没有提供下列 MP4。不要把空文件放在这里。没有视频时，网页显示原图与局部分层动作。

| 文件名 | 对应页面 | 建议画面 |
|---|---|---|
| `prologue-performance.mp4` | `life/begining.html` 的 `prologue-video` | 舞台演奏，固定短镜头 |
| `practice-bowing.mp4` | `life/scene03.html` 的 `scene03-03-video` | 第一视角练琴，真实运弓与手指 |
| `european-performance.mp4` | `life/scene05.html` 的 `scene05-03-video` | 成年演奏者和剧场光线 |

建议格式：MP4 / H.264、16:9、1920×1080 或 1280×720、6–12 秒。可使用自己拍摄或已取得适用授权的视频；不是历史真实影像。声音可另由现有合成旁白负责。

把文件放好后，到对应 HTML 将 `data-available="false"` 改为 `data-available="true"`。按钮会显示，用户点击才播放。没有文件时保持 `false`，避免 404 和黑屏。

`docs/ASSETS.md` 有实际嵌入代码和静态备用说明。
