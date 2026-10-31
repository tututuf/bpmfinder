# 四篇音乐文章：调研、结构与证据记录

日期：2026-10-31。范围：在已有 `how-to-find-key-of-a-song` 文章基础上新增四个不同意图的教程页面。不改音频分析算法、付费规则、登录或支付。

## 调研方式

先搜索类似文章，再直接读取公开页面正文与标题结构。保存的阅读记录位于 `artifacts/article-batch/research/`。`scripts/research-article-batch.mjs` 和 `scripts/research-article-supplement.mjs` 可重新获取页面；网站内容可能变化。

下面的参考用于比较读者任务、章节安排和解释方式；没有复用他人的正文或图像。公开文章的存在不证明其每个结论正确，结构参考与事实依据分别处理。

## 1. Fast & Slow Tempo

目标：解释 tempo/BPM、速度术语、计拍单位以及测量方法。承接速度快慢和术语的解释意图，不重复做一个 BPM 工具页。

| 阅读的同题材料 | 结构观察 | 本站采用与改进 |
|---|---|---|
| [Symphony Nova Scotia：How do musicians know how fast to play a piece?](https://symphonynovascotia.ca/faqs/symphony-101/how-do-musicians-know-how-fast-to-play-a-piece-and-why-are-the-terms-in-italian/) | 先定义速度与节拍单位，再解释文字指示及意大利术语列表 | 保留“数值与文字是两种表达”的解释；先给听觉例子，再给术语表 |
| [Musicca：Italian musical terms](https://www.musicca.com/musical-terms) | 分速度、速度变化、力度、技巧、情绪等类别；明确 BPM 数值仅为一般参考 | 只覆盖与速度相关的任务；不把多个资料不同的区间拼成统一标准 |
| [Ableton：Beat and tempo](https://learningmusic.ableton.com/make-beats/beat-and-tempo.html) | 区分 drum pattern 与规则 pulse，再用可操作例子解释 BPM | 增加原创 60/120/180 BPM 音频、同一时间窗口的拍点图和计数计算 |

最终章节：定义 → 原创试听 → 术语 → note value → 测量 → 速度变化 → FAQ → 来源。术语表以释义为主，没有制造统一的数值边界。

证据映射：

- 正文 [1]：Ableton，支持 pulse/BPM 和节奏型区别。
- 正文 [2]：乐团教育页，支持 metronome mark 的计拍单位与术语的表达意义。
- 正文 [3]：Musicca，支持术语、修饰语、accelerando/ritardando/a tempo。
- 1 秒、500 ms、333.333 ms、复合计拍单位与区间测量例子为公开公式的独立演算。

## 2. Average Song Tempo

目标：提供可归因的曲风参考范围，同时教用户如何计算自己歌单的均值。与速度术语页各自回答不同问题。

| 阅读的同题材料 | 结构观察 | 本站采用与改进 |
|---|---|---|
| [Ableton：Tempo and genre](https://learningmusic.ableton.com/make-beats/tempo-and-genre.html) | 简要解释曲风，列六个典型范围，鼓励调速试听 | 主表只采用这一来源，保留“typical”限定；做同轴原创范围图 |
| [iZotope：Using Different Tempos To Make Beats For Different Genres](https://www.izotope.com/community/blog/using-different-tempos-to-make-beats-for-different-genres) | 速度与感觉 → 曲风表 → 制作建议 → 速度自动化 | 用作第二参考，展示 hip-hop 范围差异及 dubstep 70/140 的计数关系；不带入产品促销 |
| [Soundplate：Typical BPM by Genre](https://soundplate.com/typical-bpm-by-genre-chart/) | 解释用途 → 大型曲风表 → 工具入口 | 参考表格的查阅方式；不把编辑参考称为对全部歌曲的实测结果 |

最终章节：均值与范围区别 → 有来源的曲风表/图 → 半拍双拍 → 自己的歌单计算 → 制作与混音使用 → FAQ → 来源。

证据映射：

- 正文 [1] Ableton 六行原始范围：Dub 60–90、Hip-hop 60–100、House 115–130、Techno/trance 120–140、Dubstep 135–145、Drum and bass 160–180。
- 正文 [2] iZotope：Hip-hop 85–95，与上表不同；House 同为 115–130；Dubstep 140/70。点值和区间没有混用。
- 正文 [3] Ableton beat definition，支持计数单位说明。
- 90/100/120/128/162 为明确标注的虚构五首样本。均值 120、替换 162→180 后为 123.6，中位数仍为 120。不称为真实歌曲统计。
- 不发表没有数据集支撑的 pop/rock “平均 BPM”，不以范围中点冒充均值。

## 3. Key Notation

目标：读懂 key label、key signature、relative/parallel 和 Camelot 标签。与已有“如何从录音找调性”页区分：这里以阅读符号为主，已有页以识别录音为主。

| 阅读的同题材料 | 结构观察 | 本站采用与改进 |
|---|---|---|
| [LANDR：Key Signatures: How Keys Work in Music](https://blog.landr.com/key-signatures/) | 定义 → 识别 → 顺序/五度圈 → 记忆 → 等音 | 参考从符号到规则的顺序，不采用只看首末音就能确定调性的绝对说法 |
| [Puget Sound 教材：Major Key Signatures](https://musictheory.pugetsound.edu/mt21c/MajorKeySignatures.html) | 定义 → 升降号规则 → 五度圈与完整谱例 | 作为调号、升降号顺序与等音的主要事实依据 |
| [Puget Sound 教材：Minor Key Signatures](https://musictheory.pugetsound.edu/mt21c/MinorKeySignatures.html) | 同主音/关系调区别 → 共用调号 → 小调实践 | 以成对 major/minor 表格避免“调号必然确定大小调”的错误 |

最终章节：读标签 → 调号与临时记号 → 升降号识别 → 15 调号完整表 → 大小调判断 → Camelot → FAQ → 来源。

证据映射：

- 正文 [1] 教材 major：15 常用调号、F C G D A E B 升号顺序、反向降号顺序、最后升号/倒数第二降号规则、F major 例外、等音拼写。
- 正文 [2] 教材 minor：关系小调与同主音小调、共用调号、小调可以有调号外的升高音级、大小写写法依记谱场景而定。
- 正文 [3] Ableton [Keys and scales](https://learningmusic.ableton.com/notes-and-scales/keys-and-scales.html)：tonic 与 key；此前文章已读取，本次复用。
- 正文 [4] [Mixed In Key Camelot Wheel](https://mixedinkey.com/camelot-wheel/)：A minor/8A、C major/8B、D major/10B；此前已核查。
- 原创双升号高音谱表示 F♯、C♯与一个 D 音，不暗示仅凭该音可以确定全曲调性。
- 复用原文章已有的 C major/A minor 原创音频及实际工具结果记录，不虚构新增识别实验。

## 4. DJ Beatmatching

目标：完成“如何凭耳朵对拍”的实际操作，用可观察症状解释临时 nudge 与持续 rate 的不同职责。

| 阅读的同题材料 | 结构观察 | 本站采用与改进 |
|---|---|---|
| [Pirate：How To Beatmatch](https://pirate.com/en/blog/how-to-beatmatch/) | 定义/设备 → 基础技巧 → 耳朵对拍 → Sync/设备 → 练习 | 参考耳机预听、清晰起拍和反复听漂移的教学顺序 |
| [DJ.Studio：10 Tips To Perfect DJ Beat Matching Techniques](https://dj.studio/blog/dj-beat-matching-techniques) | BPM/拍点/相位 → 步骤 → 多种练习 → 软件 | 参考速度/位置分开解释；不采用“真正 DJ 必须怎样”的门槛叙述 |
| [Mixxx 2.5 官方手册：DJing With Mixxx](https://manual.mixxx.org/2.5/en/chapters/djing_with_mixxx) | 增益 → 对拍 → Sync → 动态速度 → 和声混音 | 用第一方手册确认 rate slider、临时 pitch bend、Sync 对 BPM/grid 的要求与 key lock |

最终章节：两个任务 → 设备与 cue → 五步操作 → 原创试听/拍点图 → 122→120 演算 → 排错 → FAQ → 来源。

证据映射：

- 正文 [1] Mixxx beatmatching：同速+拍点对齐、持续调速/临时推拉、双击与漂移听感、Sync 依赖正确 BPM/grid。
- 正文 [2] Pirate：预听与 cue 的教学操作依据。
- 正文 [3] Mixxx harmonic mixing：key lock 把调速与调性变化分开处理。
- 原创同步双声道音频：左 120 BPM；右分别为 120 同位、120 延迟 100 ms、122 同位起拍。
- 原创推导：(120/122−1)×100 = −1.639344%；16 秒连续拍位差为 16×2/60 = 0.533333 拍。区分连续相位与文件内离散起音数量。

## 未采信的资料与访问限制

- BBC/Lumen/Open University/Open Music Theory 页面返回 403/404 或其他站点跳转，没有作为已读事实来源。
- 所尝试 Yamaha URL 为 404，不能证明初步记录中提到的 pop 范围；正文没有使用该数据。
- Native Instruments 旧 beatmatching 路径跳转到泛 beatmaking 栏目，没有当作可用教程。
- Serato support URL 403；使用可直接读取的 Mixxx 官方手册代替。
- Musicnotes 的尝试 URL 为 404；使用大学教材直接支撑调号表。
- The Online Metronome 返回的提取正文为空，没有据此引用数值。

## 实现与可复现证据

- 页面：`/blogs/fast-and-slow-tempo`、`/blogs/average-song-tempo`、`/blogs/key-notation`、`/blogs/dj-beatmatching`。
- 共用 `src/components/field-note.tsx`，正文服务器渲染；独立 canonical、description、BlogPosting citation 和可见来源清单一致。
- `src/app/blogs/articles.css` 从旧文章样式抽取，保留正文 800px 视口居中，桌面目录位于正文右侧外边距，手机为行内目录。
- 新图为可访问的内联 SVG/HTML，音频按需加载，不自动播放。
- `scripts/generate-field-note-audio.mjs` 生成并断言采样、时长、无削波、固定偏移、拍点误差、算式；公开 `public/audio/field-notes/manifest.json` 与 `verification.txt` 含 SHA256。
- 6 个 WAV 总计约 5.29 MB；浏览器 `preload="none"`。无商业录音或外部样本。
- Blogs 共五篇；新旧文章互链到真实页面和工具；公共 sitemap 增至 11 URL，没有恢复独立 key-finder 页面。
- `scripts/article-batch-check.mjs` 验证新文章；原 `key-article-check.mjs` 与 `article-toc-check.mjs` 用于回归现有文章。
- 浏览器截图和检查报告保存于 `artifacts/article-batch/`；生产检查写入 `artifacts/article-batch/production/`。

本记录描述本地实现和资料核查，不声称 Google 排名、真实流量或搜索引擎已收录这些页面。

## 最终验证（2026-10-31）

- TypeScript 检查、75 个现有单元测试、生产构建全部通过。
- 新文章在开发与生产环境完成浏览器检查；生产报告 `artifacts/article-batch/production/report.json`，无页面异常。验证375/390/768/1440、无JS正文、居中正文/侧栏、全部引用与结构化数据对应、音频按需播放/下载及SHA256。
- 原文章音频/图像弹窗/TOC回归通过；生产全站11路由SEO及真实音频/免费CSV/Pro权限/SaveResults/SPA回归通过，报告 `artifacts/seo-first-batch/production-articles/report.json`。
- 已目视核对桌面/手机截图；手机节拍图改为逐行布局以保留标签可读性。
- 临时生产预览停止，3000开发服务恢复，首页、Blogs与4新文章均返回200。
