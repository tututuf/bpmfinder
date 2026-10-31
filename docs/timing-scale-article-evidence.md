# 时间感与调性/音阶两篇文章：调研和证据

日期：2026-11-01。用户已确认题目并授权按上一批流程研究、写作、实现。此轮没有调整分析引擎、登录、付费或节拍器本身。

## 页面与意图

|页面|承接任务|与已有内容的边界|
|---|---|---|
|`/blogs/timing-in-music`|学习稳定计拍、细分、稀疏click、留空小节、录音自查|不重做速度术语，不冒充拍号检测，不重复DJ两首录音的rate/nudge操作|
|`/blogs/musical-key-and-scale`|区分音阶的音程模式、调性的主音中心，听懂关系/同主音对比|不重做15调号表或上传找调四步骤；不宣称支持音符输入查音阶|

关键词沿用 `docs/next-two-article-topics-2026-11-01.md`，每组一个页面，扩展疑问在同页小节/FAQ回答。新增文章没有新的搜索量承诺；本次无Semrush新指标。

## 先读类似文章，再设计结构

公开网页正文/标题快照：`artifacts/timing-scale/research/`。可运行：

```powershell
node scripts/research-timing-scale.mjs
node scripts/research-timing-scale-supplement.mjs
```

### 时间感篇参考

1. [Yamaha / Dr. Dave Gerhart：4 Essential Metronome Exercises to Improve Your Timing](https://hub.yamaha.com/pianos/p-how-to/how-to-use-a-metronome-to-develop-timing-skills/) — 实际返回200；从主动练习出发，分减少click、移动pulse、空白loop、录音比较。采用“逐步减少外部提示”的教学主线；音频、具体八小节安排和十分钟练习预算为本站原创。
2. [Musical U / Madars Biss：How to Improve Your Rhythm and Timing](https://www.musical-u.com/learn/how-to-improve-your-rhythm-and-timing/) — 200；基础计数 → 录音回听 → 分拍 → 乐器情境。采用录音诊断与细分练习；不复制其音频，不采用“专业/业余”的绝对判断和快速见效承诺。
3. [The Music Studio：5 Tips to Develop Your Musical Timing](https://themusicstudio.ca/5-tips-to-develop-your-musical-timing/) — 200；先记录现状，再讲伴奏、随音乐打拍、身体计拍及拍号。采用“先留下可回听记录”的思路；不采用“技能100%转移/立即见效”或所有乐队成员都应该固执保持自己的速度等说法，不重复其歌曲拍号断言。
4. [Ableton：Beat and tempo](https://learningmusic.ableton.com/make-beats/beat-and-tempo.html) — 200；一手教育资料支持pulse/BPM定义。

最终结构：概念定位 → 计数/拍手 → 偶数细分 → 稀疏click → 静音小节与原创轨道 → 录音排查 → 建议练习日程 → FAQ → 对应来源。

### Key vs Scale篇参考

1. [PianoGroove：Scales vs. Keys: The Difference](https://www.pianogroove.com/jazz-piano-lessons/scales-keys-differences/) — 200；先分scale与key，再解释tonic与基本音集合之外的和声。采用问题顺序；不复用课程内容或下载资料。
2. [Ableton：Keys and scales](https://learningmusic.ableton.com/notes-and-scales/keys-and-scales.html) — 200；从听觉“home note”到scale，含可操作示例。采用“先听中心，再看音列表”，本站音频重新创作。
3. [Musicca：Keys](https://www.musicca.com/keys) — 200；定义、调号、和弦、识别、调式、转调。作为比较结构的参考，正文不重做它的完整key百科或已有本站调号表，不采用“极少音即可排除其他调”的绝对捷径。
4. [Ableton：Building major scales](https://learningmusic.ableton.com/advanced-topics/building-major-scales.html) 与 [Building minor scales](https://learningmusic.ableton.com/advanced-topics/building-minor-scales.html) — 200；直接读取间隔模式与移调解释。
5. [Puget Sound大学教材：Minor Key Signatures](https://musictheory.pugetsound.edu/mt21c/MinorKeySignatures.html) — 200；直接支持relative/parallel与小调非单一音阶限制。

最终结构：对比定义 → 音程模式 → relative/parallel图 → 控制变量试听 → 调内使用其他音 → 创作/演奏/检测应用 → FAQ → 对应来源。

## 正文编号到事实的映射

时间感篇：

- [1] Ableton：pulse、rhythm pattern、BPM的区别。
- [2] Yamaha：减少click、改变click位置、留空loop为教学方法。本站设计的具体日程不声称是研究证明的训练处方。
- [3] Musical U：慢速计数、细分、隔离难句、录音回听。
- [4] Music Studio：用录音定位速度变化与身体计拍作为辅助。
- 120BPM→500ms/拍、2s/4拍小节、半拍250ms、稀疏click120/60/30为独立公式演算。
- 现有代码 `src/components/analyzer.tsx` 明确节拍器40–240、4个click重音循环；正文如实提醒，30click/min例子不能直接用现有控件，60click/min的重音也不等同原120BPM的每小节。
- 真实功能图由 `scripts/capture-timing-metronome.mjs` 从正常首页选择Metronome截取，120BPM、停止状态。WebP在 `public/images/tutorial/metronome-practice.webp`；截图支持现有弹窗预览。

调性篇：

- [1] Ableton Keys：有序音集合与稳定tonic，概念范围。
- [2] PianoGroove：key与scale区别、一个key不局限于基本scale的全部音。
- [3] Ableton Major：W–W–H–W–W–W–H，移调保留模式，C/D major拼写。
- [4] Ableton Minor：W–H–W–W–H–W–W。
- [5] Puget Sound：相对/同主音、natural minor调号、小调可以升高音级。
- 原创试听中的“intended home”由作曲内容定义，不谎称已上传分析得到该标签，也不保证每个听众都会作相同判断。

## 原创示例及验证

生成器：`scripts/generate-timing-scale-audio.mjs`。全部mono、22050Hz、16bit PCM、16秒、无商业录音或第三方音色。公开hash和序列：

- `/audio/timing-scale/manifest.json`
- `/audio/timing-scale/verification.txt`

时间感三段：

|文件|构造|自动断言|
|---|---|---|
|every-beat.wav|120BPM、8个4/4小节，32次click|事件数、采样位置|
|half-clicks.wav|原pulse120，每小节1/3拍各一次，16次click|所有事件只落1/3拍|
|silent-bars.wav|原pulse120，静音第3/7小节|24次click；4–6/12–14秒每个样本均为0；6/14秒回到下一小节第1拍|

调性三段：

|文件|和声与控制变量|
|---|---|
|center-c-major.wav|C–F–G–C重复两次，原创32音旋律|
|center-a-minor.wav|Am–Dm–Em–Am重复两次；与前一文件旋律逐个MIDI音完全相同，音色、BPM、时值相同，改变和声/低音|
|parallel-c-minor.wav|Cm–Fm–Gm–Cm；E/A/B降低为Eb/Ab/Bb，保留C主音|

前两段实际作曲pitch class集合都为0/2/4/5/7/9/11，第三段0/2/3/5/7/8/10。A minor刻意使用Em而非E，避免G#破坏同音集合条件；与旧文章E–Am例子区别已在正文注明。

生成器断言不削波、WAV时长/编码、磁盘读回SHA256、click事件/静音/回拍、旋律一致、集合一致与C minor音集合。6文件约4.23MB，全部按需加载，不自动播放。

这些验证证明文件按照声明构造，不证明练习效果、听觉感受或分析器准确率。

## 实现与质量检查

- 两个静态服务器文章路由；新增文章日期2026-11-01，旧文章日期保持2026-10-31。共享FieldNote按文章数据生成可见日期及BlogPosting日期。
- Sources与schema citation一致；新音频有对应AudioObject；适配原有field-notes音频路径，不改旧资源。
- 原创HTML图表可在无JS环境阅读；正文800px居中，右侧目录吸顶，不挤正文。
- Blogs共7篇，新旧页互链；站点地图13个公开URL；没有恢复已移除的homepage guides模块。
- 已扩展 `scripts/article-batch-check.mjs` 检查所有6篇共享文章、12个field-note/新音频文件、日期、引用、播放器/下载、图片弹窗、375/390/768/1440、目录、无JS与SPA导航。
- `scripts/seo-first-batch-check.mjs`更新为13个公开URL。

## 访问限制

尝试的JustinGuitar URL返回403、Berklee猜测URL404、Yamaha Developing Internal Time猜测URL404，均没有作为有效来源引用。没有把搜索摘要当作已读完整教学内容。

## 最终验证（2026-11-01）

- 类型检查、75项单元测试及生产构建通过；两个新路由均静态生成。
- 生产环境六篇共享文章检查通过：引用与Sources/BlogPosting对应、各自发布日期、12个音频文件校验、播放器实际播放、无预加载、下载文件SHA256、图片弹窗及Escape、无JS正文、375/390/768/1440布局、居中正文、右侧吸顶目录及同文档导航。
- 原有song-key文章和目录专用回归均通过。13个公开URL的SEO/工具回归通过，包括真实MP3分析、免费CSV、Pro指标权限和Save Results到Pricing的无刷新导航。
- 最终桌面文章/Blogs以及移动端音阶图已视觉检查；无浏览器页面异常。报告见 `artifacts/timing-scale/production/report.json` 和 `artifacts/seo-first-batch/production-timing-scale/report.json`。
- 临时生产预览已停止，本地开发服务已恢复3000端口（session54295）。未进行外部部署。
