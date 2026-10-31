# “How to find the key of a song” 同题文章调研

调研日期：2026-10-31。范围：寻找与现有文章同题的公开内容，阅读正文并对照本地文章。不是完整 Google Top 10 排名审计，不新增搜索量/KD，不依据检索返回顺序判断排名。

本站文章：`src/app/blogs/how-to-find-key-of-a-song/page.tsx`，公开路径 `/blogs/how-to-find-key-of-a-song`。

## 已阅读的五篇参考文章

|网站|原文|内容组织与可参考之处|
|---|---|---|
|LANDR|[How to Find the Key of a Song: The Two Best Methods](https://blog.landr.com/how-to-find-the-key-of-a-song/)|先解释调性及用途，再讲哼唱/键盘找主音、大小调、自动识别；嵌入视频并链接自家 Key & BPM Finder。可参考入口清晰、方法容易找到的组织方式。|
|MusicRadar|[5 ways for producers, remixers and DJs to find the key of a song](https://www.musicradar.com/how-to/5-ways-for-producers-remixers-and-djs-to-find-the-key-of-a-song)|按跟弹、分析音频、使用插件、练耳、钢琴卷帘五个方法展开，配图，面向制作人与 DJ。文章较早，所提软件功能不能直接当作当前版本事实。|
|Waves|[How to Find the Key of Any Song, Sample, or DAW Project with Waves Key Detector](https://www.waves.com/how-to-find-the-key-of-any-song-sample-daw-project)|围绕自家插件的实际工作流：放置分析插件、读取调性、将调性传给人声处理/和声插件。可参考“操作之后能完成什么”的场景衔接，不据此推断本站拥有相同功能。|
|Fretboard Anatomy|[How To Figure Out The Key Of A Song (Plus: A Chart With All The Chords In Each Key)](https://fretboardanatomy.com/how-to-figure-out-the-key-of-a-song/)|以十项判断清单组织，包含调号、首尾和弦、属和弦、进行与局部转调；提供和弦图表与具体曲例。可参考图表和逐例推理的表达。|
|keyandbpm / whatkeyandbpm.com|[How to find the key of a song (by ear, instrument or software)](https://whatkeyandbpm.com/blog/how-to-find-the-key-of-a-song/)|与本站最接近的工具站文章：开头直接回答，再分听音、乐器、软件三种路径，包含和弦表、相对大小调、非标准调音、转调及 FAQ，链接自己的分析器和相关教程。正文对分析器能力的描述属于该站自述，本次未做音频实测。|

检索词包含 `how to find the key of a song`、`how to tell what key a song is in by ear chords` 及限定站点的同题查询。仅核查页面可读正文；不采用检索摘要中相互冲突的更新日期。

## 本站现有覆盖

源码核对确认文章已有：

- 音频分析、听音、和弦、乐谱四种方法，以及目录与工具入口。
- 两张工具操作截图，C 大调/A 小调同音集合示例，C–F–G–C 与 Am–Dm–E–Am 示例。
- 结果不一致、等音异名、相对大小调、转调和纯打击乐说明。
- Camelot 解释与轮盘内链，四条 FAQ，以及 Ableton/Mixed In Key 参考链接。

因此不应把这些已有章节再次列为待新增，也不应再开一个只有标题措辞不同的找调教程 URL。

## 建议在原 URL 补强的内容

以下为本次阅读比较后的编辑建议，不是排名因果结论。

1. **在目录前增加方法选择表**：有音频→分析器；有乐器→听主音；有和弦→检查进行；有谱→读调号。目的在于让不同输入的读者迅速选路。
2. **让乐理示例可以看懂、听到**：现有纯文字音名补原创键盘图；如继续制作音频，用本站自行生成且经过核对的短教学样本，对照 C 大调/A 小调，提供明确播放操作。不要把竞品图表或音频直接搬进页面。
3. **增加一个从输入到核验的完整案例**：展示已知和弦/主音的教学音频、实际分析结果、人工检查步骤与 Camelot 对照。先记录真实输出，再写结论，不能为教程预设一个引擎并未返回的结果。
4. **刷新操作截图**：目前 Select audio files 所在工具区刚完成样式调整，应重新截图，避免教程界面与当前版本不一致。
5. **给现有检查清单补一个完整判断过程**：如先确定候选主音，再检查三和弦及另一段落；保留当前对转调、借用和弦、鼓循环的说明。不要用“开心=大调、悲伤=小调”替代核验。

## 页面与选题边界

- 继续由现有 `/blogs/how-to-find-key-of-a-song` 承接找调方法同义问法。
- 自动上传找调任务继续进入首页 `/#workspace`，不恢复独立 `/key-finder`。
- 调号图、读谱记法深入教学可以作为之后的 `/blogs/key-notation`，但这篇保留必要简述与内链。
- 不从同题文章数量推断搜索量、排名机会或流量收益。本轮没有修改网页、发布新文章或验证竞品分析算法。
